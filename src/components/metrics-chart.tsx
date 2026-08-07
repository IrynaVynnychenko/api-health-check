"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricPoint } from "@/lib/types";

function formatTime(ts: number, compact: boolean) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    ...(compact ? {} : { second: "2-digit" }),
  });
}

function subscribeNarrow(onStoreChange: () => void) {
  const media = window.matchMedia("(max-width: 639px)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getNarrowSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function getServerNarrowSnapshot() {
  return false;
}

export function MetricsChart({
  metrics,
  serviceName,
}: {
  metrics: MetricPoint[];
  serviceName: string;
}) {
  const isNarrow = useSyncExternalStore(
    subscribeNarrow,
    getNarrowSnapshot,
    getServerNarrowSnapshot,
  );

  const data = metrics.map((point) => ({
    time: formatTime(point.timestamp, isNarrow),
    latency: Math.round(point.latencyMs),
    errorRate: point.errorRate,
  }));

  return (
    <div className="flex h-full min-h-72 min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur sm:min-h-80 sm:p-5">
      <div className="mb-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Live metrics
          </h2>
          <p className="truncate text-sm text-slate-500">
            Latency and error-rate for {serviceName}
          </p>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-100">
          SSE stream
        </span>
      </div>

      <div className="relative min-h-56 w-full min-w-0 flex-1 sm:min-h-72">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Waiting for first probe…
          </div>
        ) : (
          <div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 8,
                  right: isNarrow ? 0 : 8,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="errorFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: isNarrow ? 10 : 11 }}
                  minTickGap={isNarrow ? 40 : 28}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="left"
                  width={isNarrow ? 34 : 48}
                  tick={{ fill: "#64748b", fontSize: isNarrow ? 10 : 11 }}
                  unit="ms"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={isNarrow ? 28 : 40}
                  tick={{ fill: "#64748b", fontSize: isNarrow ? 10 : 11 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#e2e8f0",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: isNarrow ? 11 : 12 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="latency"
                  name="Latency (ms)"
                  stroke="#0f766e"
                  fill="url(#latencyFill)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="errorRate"
                  name="Error rate (%)"
                  stroke="#e11d48"
                  fill="url(#errorFill)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
