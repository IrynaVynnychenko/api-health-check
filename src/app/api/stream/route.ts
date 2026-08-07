import { subscribe } from "@/lib/events";
import { startMonitor } from "@/lib/monitor";
import { getIncidents, getSnapshots, getWebhookEvents } from "@/lib/store";
import type { StreamEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  startMonitor();

  let cleanup: (() => void) | null = null;

  const readable = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(encode(event)));
        } catch {
          cleanup?.();
        }
      };

      send({ type: "snapshot", payload: getSnapshots() });
      for (const incident of getIncidents().slice(0, 20)) {
        send({ type: "incident", payload: incident });
      }
      for (const webhook of getWebhookEvents().slice(0, 10)) {
        send({ type: "webhook", payload: webhook });
      }

      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => {
        send({ type: "heartbeat", payload: { ts: Date.now() } });
      }, 10_000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
