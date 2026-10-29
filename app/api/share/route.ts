import { NextResponse, type NextRequest } from "next/server";
import { APP_URL, emailEnabled, emailLayout, esc, sendEmail } from "@/lib/email";
import { audit, currentUser } from "@/lib/users";

// "Email link" button: sends a link to the current dashboard view. Recipients still need access to open it.
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!emailEnabled()) return NextResponse.json({ error: "Email isn’t switched on yet. Use Copy link for now." }, { status: 503 });

  const { to, url } = (await req.json().catch(() => ({}))) as { to?: string; url?: string };
  const email = String(to ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const link = String(url ?? "");
  if (!link.startsWith(APP_URL) && !link.startsWith(req.nextUrl.origin)) return NextResponse.json({ error: "Only dashboard links can be shared." }, { status: 400 });

  const html = emailLayout(
    `${me.name ?? me.email} shared a dashboard view`,
    `<p style="margin:0;font-size:14px">${esc(me.name ?? me.email)} thought you’d want to see this view of the AllTails Care dashboard.</p>
     <p style="margin:10px 0 0;font-size:13px;color:#5a716c">You’ll need dashboard access to open it. If you don’t have it yet, ask ${esc(me.email)} for an invite.</p>`,
    { href: link, label: "Open this view" },
  );
  const r = await sendEmail(email, `${me.name ?? me.email} shared an AllTails dashboard view`, html);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  await audit(me.email, "Shared a view", `${email}: ${link.replace(/^https?:\/\/[^/]+/, "")}`);
  return NextResponse.json({ ok: true });
}
