import { NextResponse } from "next/server";
import { summarizeIncident } from "@/lib/openai";
import { publish } from "@/lib/events";
import { getIncidents, updateIncident } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const incident = getIncidents().find((item) => item.id === id);

  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const { summary, source: summarySource } = await summarizeIncident(incident);
  const updated = updateIncident(id, { summary, summarySource });

  if (!updated) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  publish({ type: "incident", payload: updated });

  return NextResponse.json({ incident: updated });
}
