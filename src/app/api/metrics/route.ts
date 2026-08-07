import { NextRequest, NextResponse } from "next/server";
import { getMetrics } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId") ?? undefined;
  return NextResponse.json({ metrics: getMetrics(serviceId) });
}
