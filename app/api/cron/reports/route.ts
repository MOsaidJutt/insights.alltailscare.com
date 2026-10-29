import { NextResponse, type NextRequest } from "next/server";
import { emailEnabled } from "@/lib/email";
import { dueToday, sendScheduledReports } from "@/lib/reports";

export const maxDuration = 60;

// Called hourly-at-9-AM-Pacific by /etc/cron.d/alltails-insights on the VPS, with CRON_SECRET as a bearer token.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!emailEnabled()) return NextResponse.json({ skipped: "Email isn’t set up yet (RESEND_API_KEY missing)." });
  return NextResponse.json({ results: await sendScheduledReports(dueToday()) });
}
