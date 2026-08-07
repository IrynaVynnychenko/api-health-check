import { MONITORED_SERVICES } from "./services";
import type {
  Incident,
  MetricPoint,
  ServiceSnapshot,
  ServiceStatus,
  WebhookEvent,
} from "./types";

const MAX_METRICS_PER_SERVICE = 120;
const MAX_WEBHOOK_EVENTS = 50;

type HubState = {
  metrics: Map<string, MetricPoint[]>;
  incidents: Incident[];
  webhookEvents: WebhookEvent[];
  statusByService: Map<string, ServiceStatus>;
  statuspageByService: Map<string, string>;
  lastCheckedAt: Map<string, number>;
};

const globalForStore = globalThis as unknown as {
  __hubStore?: HubState;
};

function createState(): HubState {
  return {
    metrics: new Map(MONITORED_SERVICES.map((s) => [s.id, []])),
    incidents: [],
    webhookEvents: [],
    statusByService: new Map(
      MONITORED_SERVICES.map((s) => [s.id, "unknown" as ServiceStatus]),
    ),
    statuspageByService: new Map(),
    lastCheckedAt: new Map(),
  };
}

function getState(): HubState {
  if (!globalForStore.__hubStore) {
    globalForStore.__hubStore = createState();
  }
  return globalForStore.__hubStore;
}

function computeErrorRate(points: MetricPoint[], windowSize = 10): number {
  if (points.length === 0) return 0;
  const window = points.slice(-windowSize);
  const failures = window.filter((p) => !p.success).length;
  return Number(((failures / window.length) * 100).toFixed(1));
}

export function addMetric(point: MetricPoint): MetricPoint {
  const state = getState();
  const series = state.metrics.get(point.serviceId) ?? [];
  const withRate: MetricPoint = {
    ...point,
    errorRate: computeErrorRate([...series, point]),
  };
  series.push(withRate);
  if (series.length > MAX_METRICS_PER_SERVICE) {
    series.splice(0, series.length - MAX_METRICS_PER_SERVICE);
  }
  state.metrics.set(point.serviceId, series);
  state.lastCheckedAt.set(point.serviceId, point.timestamp);

  const recent = series.slice(-5);
  const failCount = recent.filter((p) => !p.success).length;
  const avgLatency =
    recent.reduce((sum, p) => sum + p.latencyMs, 0) / Math.max(recent.length, 1);

  let status: ServiceStatus = "operational";
  if (failCount >= 3 || avgLatency > 2500) status = "outage";
  else if (failCount >= 1 || avgLatency > 1200) status = "degraded";

  const indicator = state.statuspageByService.get(point.serviceId);
  if (indicator === "major" || indicator === "critical") status = "outage";
  else if (indicator === "minor" && status === "operational") status = "degraded";

  state.statusByService.set(point.serviceId, status);
  return withRate;
}

export function setStatuspageIndicator(
  serviceId: string,
  indicator: string,
): void {
  getState().statuspageByService.set(serviceId, indicator);
}

export function getMetrics(serviceId?: string): MetricPoint[] {
  const state = getState();
  if (serviceId) return [...(state.metrics.get(serviceId) ?? [])];
  return MONITORED_SERVICES.flatMap((s) => [...(state.metrics.get(s.id) ?? [])]);
}

export function getRecentMetrics(serviceId: string, count = 20): MetricPoint[] {
  return getMetrics(serviceId).slice(-count);
}

export function addIncident(incident: Incident): Incident {
  const state = getState();
  state.incidents.unshift(incident);
  if (state.incidents.length > 100) state.incidents.length = 100;
  return incident;
}

export function updateIncident(
  id: string,
  patch: Partial<Incident>,
): Incident | null {
  const state = getState();
  const index = state.incidents.findIndex((i) => i.id === id);
  if (index === -1) return null;
  state.incidents[index] = { ...state.incidents[index], ...patch };
  return state.incidents[index];
}

export function getIncidents(): Incident[] {
  return [...getState().incidents];
}

export function getOpenIncident(serviceId: string): Incident | undefined {
  return getState().incidents.find(
    (i) => i.serviceId === serviceId && i.status === "open",
  );
}

export function addWebhookEvent(event: WebhookEvent): WebhookEvent {
  const state = getState();
  state.webhookEvents.unshift(event);
  if (state.webhookEvents.length > MAX_WEBHOOK_EVENTS) {
    state.webhookEvents.length = MAX_WEBHOOK_EVENTS;
  }
  return event;
}

export function getWebhookEvents(): WebhookEvent[] {
  return [...getState().webhookEvents];
}

export function getSnapshots(): ServiceSnapshot[] {
  const state = getState();
  return MONITORED_SERVICES.map((service) => {
    const series = state.metrics.get(service.id) ?? [];
    const latest = series.at(-1) ?? null;
    return {
      service,
      status: state.statusByService.get(service.id) ?? "unknown",
      latestLatencyMs: latest?.latencyMs ?? null,
      errorRate: latest?.errorRate ?? 0,
      lastCheckedAt: state.lastCheckedAt.get(service.id) ?? null,
      openIncidents: state.incidents.filter(
        (i) => i.serviceId === service.id && i.status === "open",
      ).length,
      statuspageIndicator: state.statuspageByService.get(service.id) ?? null,
    };
  });
}
