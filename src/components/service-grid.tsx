"use client";

import type { ServiceSnapshot } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function ServiceGrid({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: ServiceSnapshot[];
  selectedServiceId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {services.map((item) => {
        const active = item.service.id === selectedServiceId;
        return (
          <button
            key={item.service.id}
            type="button"
            onClick={() => onSelect(item.service.id)}
            className={`group min-w-0 rounded-2xl border p-4 text-left transition duration-300 ${
              active
                ? "border-teal-300 bg-teal-50/70 shadow-md shadow-teal-100"
                : "border-slate-200/80 bg-white/70 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.service.color }}
                  />
                  <h3 className="truncate font-semibold text-slate-900">
                    {item.service.name}
                  </h3>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {item.service.description}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs sm:gap-2">
              <Metric
                label="Latency"
                value={
                  item.latestLatencyMs != null
                    ? `${Math.round(item.latestLatencyMs)}ms`
                    : "—"
                }
              />
              <Metric label="Errors" value={`${item.errorRate}%`} />
              <Metric label="Incidents" value={String(item.openIncidents)} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2 py-2 sm:px-2.5">
      <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 truncate font-semibold text-slate-800">{value}</div>
    </div>
  );
}
