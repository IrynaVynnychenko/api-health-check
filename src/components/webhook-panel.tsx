"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { hubQueryKeys } from "@/hooks/use-live-hub";
import type { WebhookEvent } from "@/lib/types";

const EXAMPLE = {
  serviceId: "stripe",
  event: "payment_api.timeout",
  latencyMs: 2400,
  success: false,
  statusCode: 504,
  message: "Upstream gateway timeout during checkout",
};

export function WebhookPanel({ events }: { events: WebhookEvent[] }) {
  const queryClient = useQueryClient();
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [copied, setCopied] = useState(false);

  const endpoint = useMemo(() => {
    if (typeof window === "undefined") return "/api/webhooks/ingest";
    return `${window.location.origin}/api/webhooks/ingest`;
  }, []);

  const send = useMutation({
    mutationFn: async () => {
      const body = JSON.parse(payload) as unknown;
      const response = await fetch("/api/webhooks/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Webhook failed");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hubQueryKeys.webhooks });
      void queryClient.invalidateQueries({ queryKey: hubQueryKeys.incidents });
      void queryClient.invalidateQueries({ queryKey: hubQueryKeys.services });
    },
  });

  const testTelegram = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/alerts/test", { method: "POST" });
      return response.json();
    },
  });

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Webhook playground
        </h2>
        <p className="text-sm text-slate-500">
          Point any tool at your ingest endpoint to simulate vendor incidents
        </p>
      </div>

      <div className="mb-3 flex min-w-0 items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 font-mono text-[11px] text-teal-200 sm:text-xs">
        <span className="min-w-0 flex-1 truncate">{endpoint}</span>
        <button
          type="button"
          onClick={() => void copyEndpoint()}
          className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-white hover:bg-white/20"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <textarea
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        rows={8}
        className="mb-3 h-40 w-full max-w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 outline-none ring-teal-500/30 focus:ring-2 sm:h-52"
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send.mutate()}
          disabled={send.isPending}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 disabled:opacity-50"
        >
          {send.isPending ? "Sending…" : "Send test webhook"}
        </button>
        <button
          type="button"
          onClick={() => testTelegram.mutate()}
          disabled={testTelegram.isPending}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {testTelegram.isPending ? "Sending…" : "Test Telegram"}
        </button>
      </div>

      {(send.error || testTelegram.data) && (
        <p className="mb-4 text-xs text-slate-500">
          {send.error
            ? "Invalid JSON or request failed."
            : JSON.stringify(testTelegram.data)}
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-800">Recent deliveries</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">No webhook events yet.</p>
        ) : (
          events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            >
              <div className="mb-1 flex justify-between gap-2">
                <span className="font-medium text-slate-800">
                  {event.serviceHint ?? "unknown service"}
                </span>
                <span>{new Date(event.receivedAt).toLocaleTimeString()}</span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-slate-500">
                {JSON.stringify(event.body)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
