import { detectAnomaly } from "./anomaly";
import { publish } from "./events";
import { summarizeIncident } from "./openai";
import { MONITORED_SERVICES } from "./services";
import { fetchStatuspage } from "./statuspage";
import {
  addIncident,
  addMetric,
  getOpenIncident,
  getRecentMetrics,
  getSnapshots,
  setStatuspageIndicator,
  updateIncident,
} from "./store";
import { sendTelegramAlert } from "./telegram";
import type { Incident } from "./types";

const globalForMonitor = globalThis as unknown as {
  __hubMonitorStarted?: boolean;
  __hubMonitorTimer?: ReturnType<typeof setInterval>;
};

const CHECK_INTERVAL_MS = 15_000;

function maybeInjectChaos(serviceId: string): boolean {
  if (process.env.ENABLE_CHAOS !== "true") return false;
  // Deterministic-ish chaos: roughly 8% chance per tick
  const noise = (Date.now() + serviceId.length * 17) % 100;
  return noise < 8;
}

async function checkService(serviceId: string): Promise<void> {
  const service = MONITORED_SERVICES.find((s) => s.id === serviceId);
  if (!service) return;

  const url = service.statuspageUrl ?? service.healthUrl;
  let result = await fetchStatuspage(url);

  if (maybeInjectChaos(service.id)) {
    result = {
      ...result,
      ok: false,
      indicator: "major",
      description: "Simulated probe failure (chaos mode)",
      latencyMs: result.latencyMs + 1800 + Math.round(Math.random() * 1200),
      statusCode: 503,
    };
  }

  setStatuspageIndicator(service.id, result.indicator);

  const history = getRecentMetrics(service.id, 30);
  const metric = addMetric({
    timestamp: Date.now(),
    serviceId: service.id,
    latencyMs: result.latencyMs,
    success: result.ok,
    statusCode: result.statusCode,
    errorRate: 0,
    source: "statuspage",
  });

  publish({ type: "metric", payload: metric });

  const anomaly = detectAnomaly(history, metric);
  const open = getOpenIncident(service.id);

  if (anomaly.detected) {
    if (!open) {
      const logs = [
        `${new Date().toISOString()} probe latency=${Math.round(metric.latencyMs)}ms success=${metric.success}`,
        `statuspage indicator=${result.indicator} description="${result.description}"`,
        anomaly.reason,
        ...history
          .slice(-5)
          .map(
            (p) =>
              `${new Date(p.timestamp).toISOString()} ${p.latencyMs}ms ${p.success ? "ok" : "fail"}`,
          ),
      ];

      const incident: Incident = {
        id: crypto.randomUUID(),
        serviceId: service.id,
        serviceName: service.name,
        title: anomaly.title,
        severity: anomaly.severity,
        status: "open",
        startedAt: Date.now(),
        resolvedAt: null,
        logs,
        summary: null,
        source: "anomaly",
      };

      addIncident(incident);
      publish({ type: "incident", payload: incident });

      const summary = await summarizeIncident(incident);
      const updated = updateIncident(incident.id, { summary });
      if (updated) publish({ type: "incident", payload: updated });

      await sendTelegramAlert(
        [
          `<b>🚨 Incident: ${service.name}</b>`,
          `${anomaly.title} (${anomaly.severity})`,
          anomaly.reason,
          "",
          `<i>${summary}</i>`,
        ].join("\n"),
      );
    } else {
      updateIncident(open.id, {
        logs: [
          ...open.logs,
          `${new Date().toISOString()} still failing — ${anomaly.reason}`,
        ].slice(-20),
      });
    }
  } else if (open && metric.success && metric.errorRate < 15) {
    const resolved = updateIncident(open.id, {
      status: "resolved",
      resolvedAt: Date.now(),
      logs: [
        ...open.logs,
        `${new Date().toISOString()} recovered — latency ${Math.round(metric.latencyMs)}ms`,
      ],
    });
    if (resolved) {
      publish({ type: "incident", payload: resolved });
      await sendTelegramAlert(
        `<b>✅ Resolved: ${service.name}</b>\n${open.title} recovered.`,
      );
    }
  }
}

export async function runMonitorTick(): Promise<void> {
  await Promise.allSettled(
    MONITORED_SERVICES.map((service) => checkService(service.id)),
  );
  publish({ type: "snapshot", payload: getSnapshots() });
}

export function startMonitor(): void {
  if (globalForMonitor.__hubMonitorStarted) return;
  globalForMonitor.__hubMonitorStarted = true;

  void runMonitorTick();
  globalForMonitor.__hubMonitorTimer = setInterval(() => {
    void runMonitorTick();
  }, CHECK_INTERVAL_MS);
}
