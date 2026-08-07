import OpenAI from "openai";
import type { Incident } from "./types";

export async function summarizeIncident(incident: Incident): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return heuristicSummary(incident);
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
            ...incident.logs.slice(0, 12),
          ].join("\n"),
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return text || heuristicSummary(incident);
  } catch {
    return heuristicSummary(incident);
  }
}

function heuristicSummary(incident: Incident): string {
  const hint = incident.logs[0] ?? "No detailed logs available.";
  return `${incident.serviceName} triggered "${incident.title}" (${incident.severity}). Likely cause based on recent probes: ${hint} Recommend checking the vendor status page and retrying dependent workflows.`;
}
