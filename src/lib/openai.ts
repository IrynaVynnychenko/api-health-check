import OpenAI from "openai";
import type { Incident, SummarySource } from "./types";

export type IncidentSummary = {
  summary: string;
  source: SummarySource;
};

export async function summarizeIncident(
  incident: Incident,
): Promise<IncidentSummary> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return { summary: heuristicSummary(incident), source: "heuristic" };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You are an SRE assistant. Write a concise incident root-cause summary in 2-3 sentences for a B2B ops dashboard. Be practical and specific.",
        },
        {
          role: "user",
          content: [
            `Service: ${incident.serviceName}`,
            `Title: ${incident.title}`,
            `Severity: ${incident.severity}`,
            `Source: ${incident.source}`,
            "Recent logs:",
            ...selectLogs(incident.logs),
          ].join("\n"),
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return { summary: heuristicSummary(incident), source: "heuristic" };
    }
    return { summary: text, source: "openai" };
  } catch {
    return { summary: heuristicSummary(incident), source: "heuristic" };
  }
}

function selectLogs(logs: string[], limit = 12): string[] {
  if (logs.length <= limit) return logs;

  const head = logs.slice(0, 4);
  const tail = logs.slice(-(limit - head.length));
  return [...head, "…", ...tail];
}

function pickHint(logs: string[]): string {
  const preferred = [...logs]
    .reverse()
    .find(
      (line) =>
        !line.includes("still failing") &&
        !line.includes("recovered") &&
        line !== "Insufficient history",
    );

  return (
    preferred ??
    logs.find((line) => line.includes("still failing")) ??
    logs.at(-1) ??
    "No detailed logs available."
  );
}

function heuristicSummary(incident: Incident): string {
  const hint = pickHint(incident.logs);
  return `${incident.serviceName} triggered "${incident.title}" (${incident.severity}). Likely cause based on recent probes: ${hint} Recommend checking the vendor status page and retrying dependent workflows.`;
}
