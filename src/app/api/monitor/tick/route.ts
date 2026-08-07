import { NextResponse } from "next/server";
import { runMonitorTick, startMonitor } from "@/lib/monitor";
import { getSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  startMonitor();
  await runMonitorTick();
  return NextResponse.json({ ok: true, services: getSnapshots() });
}
