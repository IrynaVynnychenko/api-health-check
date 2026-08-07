"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Incident } from "@/lib/types";

const SEVERITY_STYLE: Record<Incident["severity"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

export function IncidentsPanel({ incidents }: { incidents: Incident[] }) {
  const queryClient = useQueryClient();

  const summarize = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}/summarize`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to summarize");
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Incidents
        </h2>
        <p className="text-sm text-slate-500">
          Anomaly detection with optional OpenAI root-cause summaries
        </p>
      </div>

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            No incidents yet. The monitor will open one when latency or errors
            spike.
          </p>
        ) : (
          incidents.slice(0, 8).map((incident) => (
            <article
              key={incident.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-slate-900">
                  {incident.serviceName}: {incident.title}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${SEVERITY_STYLE[incident.severity]}`}
                >
                  {incident.severity}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    incident.status === "open"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {incident.status}
                </span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {incident.summary ??
                  "Summary pending — generate one from recent probe logs."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>{new Date(incident.startedAt).toLocaleString()}</span>
                <span>source: {incident.source}</span>
                <button
                  type="button"
                  onClick={() => summarize.mutate(incident.id)}
                  disabled={summarize.isPending}
                  className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {summarize.isPending ? "Summarizing…" : "AI summary"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
