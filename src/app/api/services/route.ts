import { NextResponse } from "next/server";
import { startMonitor } from "@/lib/monitor";
import { getSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  startMonitor();
  return NextResponse.json({ services: getSnapshots() });
}
