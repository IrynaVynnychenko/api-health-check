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

export function useLiveHub() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("stripe");
  const [liveMetrics, setLiveMetrics] = useState<Record<string, MetricPoint[]>>(
    {},
  );

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () =>
      fetchJson<{ services: ServiceSnapshot[] }>("/api/services").then(
        (data) => data.services,
      ),
  });

  const incidentsQuery = useQuery({
    queryKey: ["incidents"],
    queryFn: () =>
      fetchJson<{ incidents: Incident[] }>("/api/incidents").then(
        (data) => data.incidents,
      ),
  });

  const webhooksQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: () =>
      fetchJson<{ events: WebhookEvent[] }>("/api/webhooks/events").then(
        (data) => data.events,
      ),
  });

  const metricsQuery = useQuery({
    queryKey: ["metrics", selectedServiceId],
    queryFn: () =>
      fetchJson<{ metrics: MetricPoint[] }>(
        `/api/metrics?serviceId=${selectedServiceId}`,
      ).then((data) => data.metrics),
  });

  useEffect(() => {
    const source = new EventSource("/api/stream");

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as StreamEvent;

      if (event.type === "snapshot") {
        queryClient.setQueryData(["services"], event.payload);
      }

      if (event.type === "metric") {
        const point = event.payload;
        setLiveMetrics((prev) => {
          const series = [...(prev[point.serviceId] ?? []), point].slice(-120);
          return { ...prev, [point.serviceId]: series };
        });
        void queryClient.invalidateQueries({ queryKey: ["services"] });
      }

      if (event.type === "incident") {
        queryClient.setQueryData<Incident[]>(["incidents"], (current = []) => {
          const others = current.filter((item) => item.id !== event.payload.id);
          return [event.payload, ...others].slice(0, 100);
        });
      }

      if (event.type === "webhook") {
        queryClient.setQueryData<WebhookEvent[]>(["webhooks"], (current = []) =>
          [
            event.payload,
            ...current.filter((item) => item.id !== event.payload.id),
          ].slice(0, 50),
        );
      }
    };

    return () => source.close();
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
