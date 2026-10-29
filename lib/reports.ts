import { db, type Row } from "./db";
import { sendEmail } from "./email";
import { buildReport } from "./report-email";
import { ptToday, type PeriodKey } from "./periods";
import { audit, ownerEmail } from "./users";

export type Recipient = { email: string; daily: boolean; weekly: boolean; monthly: boolean };

export async function getRecipients(): Promise<Recipient[]> {
  const sql = await db();
  await sql`CREATE TABLE IF NOT EXISTS report_recipients (
    email text PRIMARY KEY,
    daily boolean NOT NULL DEFAULT false,
    weekly boolean NOT NULL DEFAULT true,
    monthly boolean NOT NULL DEFAULT true,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  // The founder asked for every report at anjali@alltailscare.com to start with.
  await sql`INSERT INTO report_recipients (email, daily, weekly, monthly, created_by)
    SELECT ${ownerEmail()}, true, true, true, 'setup' WHERE NOT EXISTS (SELECT 1 FROM report_recipients)`;
  return (await sql`SELECT email, daily, weekly, monthly FROM report_recipients ORDER BY created_at`) as Row[] as Recipient[];
}

// Which reports go out today: daily always, weekly on Sundays, monthly on the 1st (Pacific time).
export function dueToday(): PeriodKey[] {
  const today = ptToday();
  const due: PeriodKey[] = ["daily"];
  if (today.getUTCDay() === 0) due.push("weekly");
  if (today.getUTCDate() === 1) due.push("monthly");
  return due;
}

export async function sendScheduledReports(periods: PeriodKey[]) {
  const recipients = await getRecipients();
  const results: { period: PeriodKey; sent: number; failed: string[] }[] = [];
  for (const period of periods) {
    const to = recipients.filter((r) => r[period]).map((r) => r.email);
    if (!to.length) continue;
    const { subject, html } = await buildReport(period);
    const failed: string[] = [];
    for (const email of to) {
      const r = await sendEmail(email, subject, html);
      if (!r.ok) failed.push(`${email}: ${r.error}`);
    }
    results.push({ period, sent: to.length - failed.length, failed });
    await audit("system", `Sent ${period} report`, `${to.length - failed.length} sent${failed.length ? `, ${failed.length} failed` : ""}`);
  }
  return results;
}
