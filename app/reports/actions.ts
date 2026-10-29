"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildReport } from "@/lib/report-email";
import { getRecipients } from "@/lib/reports";
import { audit, requireUser } from "@/lib/users";
import type { PeriodKey } from "@/lib/periods";

export async function addRecipient(form: FormData) {
  const me = await requireUser("admin");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/reports?e=email");
  await getRecipients();
  const sql = await db();
  await sql`INSERT INTO report_recipients (email, daily, weekly, monthly, created_by)
    VALUES (${email}, ${form.get("daily") === "on"}, ${form.get("weekly") === "on"}, ${form.get("monthly") === "on"}, ${me.email})
    ON CONFLICT (email) DO UPDATE SET daily = EXCLUDED.daily, weekly = EXCLUDED.weekly, monthly = EXCLUDED.monthly`;
  await audit(me.email, "Added report recipient", email);
  redirect("/reports");
}

export async function updateRecipient(form: FormData) {
  const me = await requireUser("admin");
  const email = String(form.get("email") ?? "");
  const sql = await db();
  await sql`UPDATE report_recipients SET daily = ${form.get("daily") === "on"}, weekly = ${form.get("weekly") === "on"},
    monthly = ${form.get("monthly") === "on"} WHERE email = ${email}`;
  await audit(me.email, "Changed report schedule", email);
  revalidatePath("/reports");
}

export async function removeRecipient(form: FormData) {
  const me = await requireUser("admin");
  const email = String(form.get("email") ?? "");
  const sql = await db();
  await sql`DELETE FROM report_recipients WHERE email = ${email}`;
  await audit(me.email, "Removed report recipient", email);
  revalidatePath("/reports");
}

export async function sendTest(form: FormData) {
  const me = await requireUser("admin");
  const period = (String(form.get("period")) as PeriodKey) || "weekly";
  const { subject, html } = await buildReport(period);
  const r = await sendEmail(me.email, `[Test] ${subject}`, html);
  redirect(r.ok ? `/reports?sent=${period}` : `/reports?e=send&msg=${encodeURIComponent(r.error)}`);
}
