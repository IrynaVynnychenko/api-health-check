"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  Incident,
  MetricPoint,
  ServiceSnapshot,
  StreamEvent,
  WebhookEvent,
} from "@/lib/types";

const SERVICES_KEY = ["hub", "services"] as const;
const INCIDENTS_KEY = ["hub", "incidents"] as const;
const WEBHOOKS_KEY = ["hub", "webhooks"] as const;
const metricsKey = (serviceId: string) =>
  ["hub", "metrics", serviceId] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json() as Promise<T>;
}

function mergeMetrics(base: MetricPoint[], live: MetricPoint[]): MetricPoint[] {
  const byTimestamp = new Map<number, MetricPoint>();
  for (const point of base) byTimestamp.set(point.timestamp, point);
  for (const point of live) byTimestamp.set(point.timestamp, point);
  return [...byTimestamp.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-120);
}

function patchServiceFromMetric(
  services: ServiceSnapshot[] | undefined,
  point: MetricPoint,
): ServiceSnapshot[] | undefined {
  if (!services) return services;
  return services.map((item) =>
    item.service.id === point.serviceId
      ? {
          ...item,
          latestLatencyMs: point.latencyMs,
          errorRate: point.errorRate,
          lastCheckedAt: point.timestamp,
        }
      : item,
  );
}

export function useLiveHub() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("stripe");
  const [liveMetrics, setLiveMetrics] = useState<Record<string, MetricPoint[]>>(
    {},
  );

  const servicesQuery = useQuery({
    queryKey: SERVICES_KEY,
    queryFn: () =>
      fetchJson<{ services: ServiceSnapshot[] }>("/api/services").then(
        (data) => data.services,
      ),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const incidentsQuery = useQuery({
    queryKey: INCIDENTS_KEY,
    queryFn: () =>
      fetchJson<{ incidents: Incident[] }>("/api/incidents").then(
        (data) => data.incidents,
      ),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const webhooksQuery = useQuery({
    queryKey: WEBHOOKS_KEY,
    queryFn: () =>
      fetchJson<{ events: WebhookEvent[] }>("/api/webhooks/events").then(
        (data) => data.events,
      ),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const metricsQuery = useQuery({
    queryKey: metricsKey(selectedServiceId),
    queryFn: () =>
      fetchJson<{ metrics: MetricPoint[] }>(
        `/api/metrics?serviceId=${selectedServiceId}`,
      ).then((data) => data.metrics),
    staleTime: 30_000,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const source = new EventSource("/api/stream");
    let active = true;

    source.onopen = () => {
      if (active) setConnected(true);
    };
    source.onerror = () => {
      if (active) setConnected(false);
    };

    source.onmessage = (message) => {
      if (!active) return;

      let event: StreamEvent;
      try {
        event = JSON.parse(message.data) as StreamEvent;
      } catch {
        return;
      }

      if (event.type === "heartbeat") return;

      if (event.type === "snapshot") {
        queryClient.setQueryData(SERVICES_KEY, event.payload);
        return;
      }

      if (event.type === "metric") {
        const point = event.payload;
        setLiveMetrics((prev) => {
          const series = [...(prev[point.serviceId] ?? []), point].slice(-120);
          return { ...prev, [point.serviceId]: series };
        });
        queryClient.setQueryData<ServiceSnapshot[]>(SERVICES_KEY, (current) =>
          patchServiceFromMetric(current, point),
        );
        return;
      }

      if (event.type === "incident") {
        queryClient.setQueryData<Incident[]>(INCIDENTS_KEY, (current = []) => {
          const others = current.filter((item) => item.id !== event.payload.id);
          return [event.payload, ...others].slice(0, 100);
        });
        return;
      }

      if (event.type === "webhook") {
        queryClient.setQueryData<WebhookEvent[]>(WEBHOOKS_KEY, (current = []) =>
          [
            event.payload,
            ...current.filter((item) => item.id !== event.payload.id),
          ].slice(0, 50),
        );
      }
    };

    return () => {
      active = false;
      source.onmessage = null;
      source.onerror = null;
      source.onopen = null;
      source.close();
    };
  }, [queryClient]);

  const chartMetrics = mergeMetrics(
    metricsQuery.data ?? [],
    liveMetrics[selectedServiceId] ?? [],
  );

  return {
    connected,
    selectedServiceId,
    setSelectedServiceId,
    services: servicesQuery.data ?? [],
    incidents: incidentsQuery.data ?? [],
    webhooks: webhooksQuery.data ?? [],
    chartMetrics,
    isLoading: servicesQuery.isLoading,
  };
}

export const hubQueryKeys = {
  services: SERVICES_KEY,
  incidents: INCIDENTS_KEY,
  webhooks: WEBHOOKS_KEY,
  metrics: metricsKey,
};
