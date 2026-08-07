"use client";

import { useLiveHub } from "@/hooks/use-live-hub";
import { IncidentsPanel } from "./incidents-panel";
import { MetricsChart } from "./metrics-chart";
import { ServiceGrid } from "./service-grid";
import { WebhookPanel } from "./webhook-panel";

export function Dashboard() {
  const {
    connected,
    selectedServiceId,
    setSelectedServiceId,
    services,
    incidents,
    webhooks,
    chartMetrics,
    isLoading,
  } = useLiveHub();

  const selected =
    services.find((item) => item.service.id === selectedServiceId) ??
    services[0];

  const operational = services.filter((s) => s.status === "operational").length;
  const degraded = services.filter((s) => s.status === "degraded").length;
  const outages = services.filter((s) => s.status === "outage").length;
  const openIncidents = incidents.filter((i) => i.status === "open").length;

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-5 overflow-x-clip px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="animate-fade-up flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 sm:text-xs sm:tracking-[0.22em]">
            Smart API Health & Incident Hub
          </p>
          <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
            Third-party API monitoring with live anomaly detection
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Track Stripe, OpenAI, GitHub, Resend and more. Stream latency and
            error-rate over SSE, open incidents automatically, and fan out
            alerts to Telegram.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          <span
            className={`size-2 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`}
          />
          <span className="sm:hidden">{connected ? "Live" : "Connecting…"}</span>
          <span className="hidden sm:inline">
            {connected ? "Live stream connected" : "Connecting…"}
          </span>
        </div>
      </header>

      <section className="animate-fade-up-delay grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Operational" value={String(operational)} tone="ok" />
        <Stat label="Degraded" value={String(degraded)} tone="warn" />
        <Stat label="Outages" value={String(outages)} tone="bad" />
        <Stat label="Open incidents" value={String(openIncidents)} tone="info" />
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-16 text-center text-sm text-slate-400">
          Bootstrapping monitors…
        </div>
      ) : (
        <>
          <ServiceGrid
            services={services}
            selectedServiceId={selected?.service.id ?? selectedServiceId}
            onSelect={setSelectedServiceId}
          />

          <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <MetricsChart
              metrics={chartMetrics}
              serviceName={selected?.service.name ?? "Service"}
            />
            <WebhookPanel events={webhooks} />
          </div>

          <IncidentsPanel incidents={incidents} />
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "info";
}) {
  const tones = {
    ok: "from-emerald-50 to-white text-emerald-800",
    warn: "from-amber-50 to-white text-amber-800",
    bad: "from-rose-50 to-white text-rose-800",
    info: "from-slate-50 to-white text-slate-800",
  };

  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-gradient-to-br p-3 shadow-sm sm:p-4 ${tones[tone]}`}
    >
      <div className="truncate text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {value}
      </div>
    </div>
  );
}
