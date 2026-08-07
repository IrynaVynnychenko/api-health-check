import { NextResponse } from "next/server";
import { getWebhookEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ events: getWebhookEvents() });
}
