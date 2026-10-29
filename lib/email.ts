import nodemailer from "nodemailer";

// Sends email through SMTP (the Google Workspace mailbox, via an app password) or, failing
// that, Resend's REST API. Everything email-related checks emailEnabled() first, so the
// dashboard works normally until one of them is configured.

export const APP_URL = process.env.APP_URL ?? "https://insights.alltailscare.com";
const FROM = process.env.EMAIL_FROM ?? "AllTails Care Insights <insights@alltailscare.com>";

const smtpEnabled = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
export const emailEnabled = () => smtpEnabled() || Boolean(process.env.RESEND_API_KEY);

let transport: nodemailer.Transporter | undefined;
function smtp() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!emailEnabled()) return { ok: false, error: "Email isn’t set up yet." };
  if (smtpEnabled()) {
    try {
      await smtp().sendMail({ from: FROM, to, subject, html });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "SMTP send failed" };
    }
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, error: body.message ?? `Resend returned ${res.status}` };
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Shared shell for every email: table layout and inline styles so it renders in Gmail and Outlook.
export function emailLayout(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f9f8;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#11302b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f9f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e1e8e6;border-radius:14px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e1e8e6">
<span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:#1f9a89;vertical-align:middle"></span>
<b style="font-size:15px;vertical-align:middle;margin-left:8px">AllTails Care Insights</b></td></tr>
<tr><td style="padding:22px 24px"><h1 style="margin:0 0 14px;font-size:20px;line-height:1.3">${esc(title)}</h1>${body}
${cta ? `<p style="margin:22px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#1f9a89;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:10px">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e1e8e6;font-size:12px;color:#5a716c">Sent by AllTails Care Insights · ${esc(APP_URL.replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;
}
