import type { StreamEvent } from "./types";

type Listener = (event: StreamEvent) => void;

const globalForEvents = globalThis as unknown as {
  __hubListeners?: Set<Listener>;
};

function getListeners(): Set<Listener> {
  if (!globalForEvents.__hubListeners) {
    globalForEvents.__hubListeners = new Set();
  }
  return globalForEvents.__hubListeners;
}

export function subscribe(listener: Listener): () => void {
  const listeners = getListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publish(event: StreamEvent): void {
  for (const listener of getListeners()) {
    try {
      listener(event);
    } catch {
      // Ignore broken subscribers
    }
  }
}
