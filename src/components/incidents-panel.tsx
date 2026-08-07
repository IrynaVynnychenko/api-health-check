"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { hubQueryKeys, upsertIncident } from "@/hooks/use-live-hub";
import type { Incident } from "@/lib/types";

const SEVERITY_STYLE: Record<Incident["severity"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

export function IncidentsPanel({ incidents }: { incidents: Incident[] }) {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const summarize = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}/summarize`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        incident?: Incident | null;
        error?: string;
      };
      if (!response.ok || !data.incident) {
        throw new Error(data.error ?? "Failed to summarize");
      }
      return data.incident;
    },
    onMutate: (id) => {
      setPendingIds((prev) => new Set(prev).add(id));
      setErrors((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    onSuccess: (incident) => {
      queryClient.setQueryData<Incident[]>(hubQueryKeys.incidents, (current) =>
        upsertIncident(current, incident),
      );
    },
    onError: (error, id) => {
      setErrors((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : "Failed to summarize",
      }));
    },
    onSettled: (_data, _error, id) => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
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
          incidents.slice(0, 8).map((incident) => {
            const isPending = pendingIds.has(incident.id);
            const error = errors[incident.id];

            return (
              <article
                key={incident.id}
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words font-medium text-slate-900">
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

                <p className="mt-2 text-sm leading-relaxed break-words text-slate-600">
                  {incident.summary ??
                    "Summary pending — generate one from recent probe logs."}
                </p>

                {error ? (
                  <p className="mt-2 text-xs text-rose-600">{error}</p>
                ) : null}

                <div className="mt-3 flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                    <span>{new Date(incident.startedAt).toLocaleString()}</span>
                    <span>source: {incident.source}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => summarize.mutate(incident.id)}
                    disabled={isPending}
                    className="w-full rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50 sm:ml-auto sm:w-auto"
                  >
                    AI summary
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
