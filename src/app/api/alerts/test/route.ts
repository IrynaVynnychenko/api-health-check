import { NextResponse } from "next/server";
import { sendTelegramAlert } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await sendTelegramAlert(
    "<b>API Health Hub</b>\nTest alert from your dashboard. Telegram integration is working.",
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: result.skipped ? 200 : 502 });
  }

  return NextResponse.json(result);
}
