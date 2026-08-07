import type { ServiceStatus } from "@/lib/types";

const STYLES: Record<ServiceStatus, string> = {
  operational: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  degraded: "bg-amber-100 text-amber-900 ring-amber-200",
  outage: "bg-rose-100 text-rose-800 ring-rose-200",
  unknown: "bg-slate-100 text-slate-700 ring-slate-200",
};

const LABELS: Record<ServiceStatus, string> = {
  operational: "ok",
  degraded: "degraded",
  outage: "outage",
  unknown: "unknown",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset sm:px-2.5 sm:text-xs ${STYLES[status]}`}
      title={status}
    >
      <span
        className={`size-1.5 rounded-full ${
          status === "operational"
            ? "bg-emerald-500"
            : status === "degraded"
              ? "bg-amber-500"
              : status === "outage"
                ? "bg-rose-500"
                : "bg-slate-400"
        }`}
      />
      <span className="sm:hidden">{LABELS[status]}</span>
      <span className="hidden sm:inline">{status}</span>
    </span>
  );
}
