export type ServiceStatus = "operational" | "degraded" | "outage" | "unknown";

export type MonitoredService = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  healthUrl: string;
  statuspageUrl?: string;
};

export type MetricPoint = {
  timestamp: number;
  serviceId: string;
  latencyMs: number;
  success: boolean;
  statusCode: number | null;
  errorRate: number;
  source: "probe" | "statuspage" | "webhook";
};

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type Incident = {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  severity: IncidentSeverity;
  status: "open" | "resolved";
  startedAt: number;
  resolvedAt: number | null;
  logs: string[];
  summary: string | null;
  source: "anomaly" | "statuspage" | "webhook";
};

export type WebhookEvent = {
  id: string;
  receivedAt: number;
  headers: Record<string, string>;
  body: unknown;
  serviceHint: string | null;
};

export type ServiceSnapshot = {
  service: MonitoredService;
  status: ServiceStatus;
  latestLatencyMs: number | null;
  errorRate: number;
  lastCheckedAt: number | null;
  openIncidents: number;
  statuspageIndicator: string | null;
};

export type StreamEvent =
  | { type: "snapshot"; payload: ServiceSnapshot[] }
  | { type: "metric"; payload: MetricPoint }
  | { type: "incident"; payload: Incident }
  | { type: "webhook"; payload: WebhookEvent }
  | { type: "heartbeat"; payload: { ts: number } };
