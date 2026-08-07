import { NextResponse } from "next/server";
import { getIncidents } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ incidents: getIncidents() });
}
