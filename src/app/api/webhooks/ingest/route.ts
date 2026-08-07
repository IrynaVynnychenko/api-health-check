import { NextRequest, NextResponse } from "next/server";
import { detectAnomaly } from "@/lib/anomaly";
import { publish } from "@/lib/events";
import { summarizeIncident } from "@/lib/openai";
import { getServiceById } from "@/lib/services";
import {
  addIncident,
  addMetric,
  addWebhookEvent,
  getOpenIncident,
  getRecentMetrics,
  updateIncident,
} from "@/lib/store";
import { sendTelegramAlert } from "@/lib/telegram";
import type { Incident } from "@/lib/types";

export const dynamic = "force-dynamic";

type IngestBody = {
  serviceId?: string;
  event?: string;
  latencyMs?: number;
  success?: boolean;
  statusCode?: number;
  message?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  let body: IngestBody = {};
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    body = {};
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (["authorization", "cookie"].includes(key.toLowerCase())) return;
    headers[key] = value;
  });

  const serviceHint =
    body.serviceId ??
    request.headers.get("x-service-id") ??
    (typeof body.event === "string" ? body.event : null);

  const event = addWebhookEvent({
    id: crypto.randomUUID(),
    receivedAt: Date.now(),
    headers,
    body,
    serviceHint,
  });
  publish({ type: "webhook", payload: event });

  const service = serviceHint ? getServiceById(serviceHint) : undefined;

  if (service) {
    const latencyMs =
      typeof body.latencyMs === "number"
        ? body.latencyMs
        : 400 + Math.round(Math.random() * 900);
    const success = typeof body.success === "boolean" ? body.success : false;
    const statusCode =
      typeof body.statusCode === "number" ? body.statusCode : success ? 200 : 500;

    const history = getRecentMetrics(service.id, 30);
    const metric = addMetric({
      timestamp: Date.now(),
      serviceId: service.id,
      latencyMs,
      success,
      statusCode,
      errorRate: 0,
      source: "webhook",
    });
    publish({ type: "metric", payload: metric });

    const anomaly = detectAnomaly(history, metric);
    const shouldOpen = anomaly.detected || !success;
    const open = getOpenIncident(service.id);

    if (shouldOpen && !open) {
      const incident: Incident = {
        id: crypto.randomUUID(),
        serviceId: service.id,
        serviceName: service.name,
        title: body.event
          ? `Webhook: ${String(body.event)}`
          : anomaly.detected
            ? anomaly.title
            : "Webhook-reported failure",
        severity: anomaly.detected ? anomaly.severity : "medium",
        status: "open",
        startedAt: Date.now(),
        resolvedAt: null,
        logs: [
          `Webhook payload: ${JSON.stringify(body).slice(0, 500)}`,
          body.message ? String(body.message) : "No message provided",
          anomaly.reason,
        ],
        summary: null,
        source: "webhook",
      };

      addIncident(incident);
      publish({ type: "incident", payload: incident });

      const summary = await summarizeIncident(incident);
      const updated = updateIncident(incident.id, { summary });
      if (updated) publish({ type: "incident", payload: updated });

      await sendTelegramAlert(
        [
          `<b>Webhook incident: ${service.name}</b>`,
          incident.title,
          summary,
        ].join("\n"),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    received: event,
    hint: "POST JSON with { serviceId, latencyMs, success, statusCode, event, message }",
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/webhooks/ingest",
    method: "POST",
    example: {
      serviceId: "stripe",
      event: "payment_api.timeout",
      latencyMs: 2400,
      success: false,
      statusCode: 504,
      message: "Upstream gateway timeout during checkout",
    },
  });
}
