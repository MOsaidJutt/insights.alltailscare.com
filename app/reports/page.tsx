import Link from "next/link";
import { Card, Head, Shell } from "@/components/Shell";
import { ConfirmButton } from "@/components/Tools";
import { emailEnabled } from "@/lib/email";
import { buildReport } from "@/lib/report-email";
import { getRecipients } from "@/lib/reports";
import { periodFrom } from "@/lib/periods";
import { requireUser } from "@/lib/users";
import { addRecipient, removeRecipient, sendTest, updateRecipient } from "./actions";

const SCHEDULE = [
  ["daily", "Daily", "Every morning at 8 AM Pacific (9 AM in summer), covering yesterday"],
  ["weekly", "Weekly", "Sunday morning, covering the previous Sunday to Saturday"],
  ["monthly", "Monthly", "The 1st of each month in the morning, covering the last 30 days"],
] as const;

export default async function Reports({ searchParams }: { searchParams: Promise<{ e?: string; msg?: string; sent?: string; preview?: string }> }) {
  const me = await requireUser("admin");
  const q = await searchParams;
  const enabled = emailEnabled();
  const preview = periodFrom(q.preview ?? "weekly");
  const [recipients, report] = await Promise.all([getRecipients(), buildReport(preview)]);

  return (
    <Shell active="/reports" period="monthly" showPeriod={false} showPlatform={false}>
      <Head eyebrow="Email" title="Scheduled reports" />

      <section className={`card status ${enabled ? "on" : "off"}`}>
        <b>{enabled ? "Email is on" : "Email is ready but not switched on yet"}</b>
        <span className="muted">
          {enabled
            ? "Reports, invites and shared links are sent from reports@alltailscare.com."
            : "A few DNS records need adding in Wix so emails can come from @alltailscare.com. Until then, invites use copyable links and reports are paused. Everything below is saved and starts automatically once email is on."}
        </span>
      </section>
      {q.sent && <p className="ok-banner">Test {q.sent} report sent to {me.email}.</p>}
      {q.e === "email" && <p className="err banner-err">Enter a valid email address.</p>}
      {q.e === "send" && <p className="err banner-err">The test email didn’t send: {q.msg}</p>}

      <div className="grid g2">
        <Card title="Who gets which report">
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Email</th>{SCHEDULE.map(([k, l]) => <th key={k} style={{ textAlign: "center" }}>{l}</th>)}<th></th></tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.email}>
                    <td>{r.email}</td>
                    {SCHEDULE.map(([k, l]) => (
                      <td key={k} style={{ textAlign: "center" }}>
                        <input type="checkbox" name={k} defaultChecked={r[k]} form={`rcpt-${r.email}`} aria-label={`${l} report for ${r.email}`} />
                      </td>
                    ))}
                    <td className="row-actions">
                      <form id={`rcpt-${r.email}`} action={updateRecipient}>
                        <input type="hidden" name="email" value={r.email} />
                        <button type="submit" className="mini-btn">Save</button>
                      </form>
                      <form action={removeRecipient}>
                        <input type="hidden" name="email" value={r.email} />
                        <ConfirmButton message={`Stop all reports to ${r.email}?`}>Remove</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={addRecipient} className="invite-form" style={{ marginTop: 16 }}>
            <label htmlFor="rcpt-email">Add a recipient</label>
            <input id="rcpt-email" name="email" type="email" required placeholder="name@example.com" />
            <div className="checks">
              {SCHEDULE.map(([k, l]) => (
                <label key={k}><input type="checkbox" name={k} defaultChecked={k !== "daily"} /> {l}</label>
              ))}
            </div>
            <button type="submit">Add recipient</button>
          </form>
        </Card>

        <Card title="When reports go out">
          <div className="tbl">
            <table>
              <tbody>
                {SCHEDULE.map(([k, l, when]) => (
                  <tr key={k}><td>{l}</td><td style={{ textAlign: "left", whiteSpace: "normal" }}>{when}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">Each report has new users, active users and sessions with the change, the top channels, the new-user funnel and any notes.</p>
          {enabled && (
            <form action={sendTest} className="inline-form" style={{ marginTop: 12 }}>
              <select name="period" defaultValue={preview} aria-label="Report to test">
                {SCHEDULE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button type="submit" className="mini-btn">Send me a test</button>
            </form>
          )}
        </Card>
      </div>

      <Card title="Preview" src="Exactly what recipients receive, with today’s numbers">
        <nav className="seg" aria-label="Preview report" style={{ marginBottom: 12 }}>
          {SCHEDULE.map(([k, l]) => (
            <Link key={k} href={`/reports?preview=${k}`} aria-current={k === preview ? "true" : undefined}>{l}</Link>
          ))}
        </nav>
        <p className="muted" style={{ margin: "0 0 8px", fontSize: 13 }}>Subject: <b>{report.subject}</b></p>
        <iframe className="email-preview" title="Report email preview" srcDoc={report.html} />
      </Card>
    </Shell>
  );
}
