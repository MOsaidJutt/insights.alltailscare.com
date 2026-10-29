"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Row } from "@/lib/db";
import { randomToken } from "@/lib/session";
import { APP_URL, emailEnabled, emailLayout, esc, sendEmail } from "@/lib/email";
import { ROLE_LABEL, audit, requireUser, type Role } from "@/lib/users";

const INVITE_DAYS = 14;
const assignable = (r: string): r is "admin" | "viewer" => r === "admin" || r === "viewer";

export async function createInvite(form: FormData) {
  const me = await requireUser("admin");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "viewer");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/team?e=email");
  if (!assignable(role)) redirect("/team?e=role");

  const sql = await db();
  const member = (await sql`SELECT 1 FROM users WHERE email = ${email}`) as Row[];
  if (member.length) redirect("/team?e=member");

  const token = randomToken();
  await sql`DELETE FROM invites WHERE email = ${email} AND accepted_at IS NULL`;
  await sql`
    INSERT INTO invites (token, email, role, created_by, expires_at)
    VALUES (${token}, ${email}, ${role}, ${me.email}, now() + make_interval(days => ${INVITE_DAYS}))`;
  await audit(me.email, "Invited", `${email} as ${ROLE_LABEL[role]}`);

  let emailed = false;
  if (emailEnabled()) {
    const html = emailLayout(
      "You’re invited to AllTails Care Insights",
      `<p style="margin:0;font-size:14px">${esc(me.name ?? me.email)} invited you to the AllTails Care dashboard as <b>${ROLE_LABEL[role]}</b>.</p>
       <p style="margin:10px 0 0;font-size:13px;color:#5a716c">Sign in with the Google account for ${esc(email)}. The link works once and expires in ${INVITE_DAYS} days.</p>`,
      { href: `${APP_URL}/invite/${token}`, label: "Accept invite" },
    );
    emailed = (await sendEmail(email, "You’re invited to AllTails Care Insights", html)).ok;
  }
  redirect(`/team?invited=${encodeURIComponent(token)}${emailed ? "&emailed=1" : ""}`);
}

export async function revokeInvite(form: FormData) {
  const me = await requireUser("admin");
  const token = String(form.get("token") ?? "");
  const sql = await db();
  const rows = (await sql`DELETE FROM invites WHERE token = ${token} AND accepted_at IS NULL RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Cancelled invite", String(rows[0].email));
  revalidatePath("/team");
}

export async function changeRole(form: FormData) {
  const me = await requireUser("admin");
  const id = Number(form.get("id"));
  const role = String(form.get("role") ?? "");
  if (!assignable(role) || id === me.id) redirect("/team?e=role");
  const sql = await db();
  const rows = (await sql`UPDATE users SET role = ${role} WHERE id = ${id} AND role <> 'owner' RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Changed role", `${rows[0].email} → ${ROLE_LABEL[role as Role]}`);
  revalidatePath("/team");
}

export async function removeUser(form: FormData) {
  const me = await requireUser("admin");
  const id = Number(form.get("id"));
  if (id === me.id) redirect("/team?e=self");
  const sql = await db();
  const rows = (await sql`DELETE FROM users WHERE id = ${id} AND role <> 'owner' RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Removed access", String(rows[0].email));
  revalidatePath("/team");
}
