export type StatuspagePayload = {
  indicator: string;
  description: string;
  latencyMs: number;
  ok: boolean;
  statusCode: number | null;
  raw?: unknown;
};

export async function fetchStatuspage(
  url: string,
  timeoutMs = 8000,
): Promise<StatuspagePayload> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    const statusCode = response.status;

    if (!response.ok) {
      return {
        indicator: "major",
        description: `HTTP ${statusCode}`,
        latencyMs,
        ok: false,
        statusCode,
      };
    }

    const data = (await response.json()) as {
      status?: { indicator?: string; description?: string };
    };

    const indicator = data.status?.indicator ?? "none";
    const description = data.status?.description ?? "Unknown";
    const ok = indicator === "none" || indicator === "operational";

    return {
      indicator,
      description,
      latencyMs,
      ok,
      statusCode,
      raw: data,
    };
  } catch (error) {
    return {
      indicator: "critical",
      description: error instanceof Error ? error.message : "Probe failed",
      latencyMs: Date.now() - started,
      ok: false,
      statusCode: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
