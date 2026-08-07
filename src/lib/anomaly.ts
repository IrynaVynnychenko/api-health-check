import type { IncidentSeverity, MetricPoint } from "./types";

export type AnomalyResult = {
  detected: boolean;
  title: string;
  severity: IncidentSeverity;
  reason: string;
};

export function detectAnomaly(
  series: MetricPoint[],
  latest: MetricPoint,
): AnomalyResult {
  if (series.length < 5) {
    return {
      detected: false,
      title: "",
      severity: "low",
      reason: "Insufficient history",
    };
  }

  const baseline = series.slice(0, -1);
  const avgLatency =
    baseline.reduce((sum, p) => sum + p.latencyMs, 0) / baseline.length;
  const recentFailures = series.slice(-5).filter((p) => !p.success).length;

  if (!latest.success && recentFailures >= 3) {
    return {
      detected: true,
      title: "Elevated failure rate",
      severity: recentFailures >= 5 ? "critical" : "high",
      reason: `${recentFailures}/5 recent probes failed (last status ${latest.statusCode ?? "n/a"}).`,
    };
  }

  if (latest.latencyMs > Math.max(avgLatency * 2.5, 1500)) {
    return {
      detected: true,
      title: "Latency spike detected",
      severity: latest.latencyMs > 3000 ? "high" : "medium",
      reason: `Latency ${Math.round(latest.latencyMs)}ms vs baseline ${Math.round(avgLatency)}ms.`,
    };
  }

  if (latest.errorRate >= 40) {
    return {
      detected: true,
      title: "Error-rate threshold breached",
      severity: latest.errorRate >= 70 ? "critical" : "high",
      reason: `Rolling error-rate at ${latest.errorRate}%.`,
    };
  }

  return {
    detected: false,
    title: "",
    severity: "low",
    reason: "Within normal bounds",
  };
}
