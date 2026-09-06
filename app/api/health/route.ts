import { NextResponse } from "next/server";
import { getSystemHealthReport } from "@/server/health/system-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getSystemHealthReport();
  return NextResponse.json(report, {
    status: report.status === "critical" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
