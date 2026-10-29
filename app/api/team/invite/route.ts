import { NextResponse, type NextRequest } from "next/server";
import { db, type Row } from "@/lib/db";
import { APP_URL, emailEnabled, emailLayout, esc, sendEmail } from "@/lib/email";
import { describeSections, sectionsFromForm } from "@/lib/sections";
import { randomToken } from "@/lib/session";
import { ROLE_LABEL, audit, canManage, currentUser } from "@/lib/users";

const INVITE_DAYS = 14;

// Plain form POST with a full-page redirect, so the new invite link always renders on /team.
export async function POST(req: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/team?${q}`, req.url), 303);
  const me = await currentUser();
  if (!me || !canManage(me)) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "viewer");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back("e=email");
  if (role !== "admin" && role !== "viewer") return back("e=role");

  const sql = await db();
  if (((await sql`SELECT 1 FROM users WHERE email = ${email}`) as Row[]).length) return back("e=member");

  // Admins always see everything, so section limits only apply to viewers.
  const sections = role === "viewer" ? sectionsFromForm(form) : null;
  const token = randomToken();
  await sql`DELETE FROM invites WHERE email = ${email} AND accepted_at IS NULL`;
  await sql`
    INSERT INTO invites (token, email, role, sections, created_by, expires_at)
    VALUES (${token}, ${email}, ${role}, ${sections}, ${me.email}, now() + make_interval(days => ${INVITE_DAYS}))`;
  await audit(me.email, "Invited", `${email} as ${ROLE_LABEL[role]} · ${describeSections(sections)}`);

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
  return back(`invited=${encodeURIComponent(token)}${emailed ? "&emailed=1" : ""}`);
}
