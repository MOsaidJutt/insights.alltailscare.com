import { Card, Head, Shell } from "@/components/Shell";
import { ConfirmButton, CopyField } from "@/components/Tools";
import { db, type Row } from "@/lib/db";
import { APP_URL } from "@/lib/email";
import { ROLE_HELP, ROLE_LABEL, requireUser, type Role } from "@/lib/users";
import { changeAccess, removeUser, revokeInvite } from "./actions";
import { SECTIONS, describeSections } from "@/lib/sections";

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  role: "That role can’t be given here.",
  member: "That person already has access.",
  self: "You can’t remove yourself.",
};

const when = (v: unknown) =>
  v
    ? new Date(v as string).toLocaleString("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Never";

export default async function Team({ searchParams }: { searchParams: Promise<{ e?: string; invited?: string; emailed?: string }> }) {
  const me = await requireUser("admin");
  const { e, invited, emailed } = await searchParams;
  const sql = await db();
  const [users, invites, log] = (await Promise.all([
    sql`SELECT id, email, name, role, sections, last_login_at FROM users ORDER BY (role = 'owner') DESC, (role = 'admin') DESC, email`,
    sql`SELECT token, email, role, sections, created_by, expires_at FROM invites WHERE accepted_at IS NULL AND expires_at > now() ORDER BY created_at DESC`,
    sql`SELECT at, actor, action, detail FROM audit ORDER BY at DESC LIMIT 50`,
  ])) as Row[][];
  const link = (token: unknown) => `${APP_URL}/invite/${token}`;
  const newInvite = invited && invites.find((i) => i.token === invited);

  return (
    <Shell active="/team" period="monthly" showPeriod={false} showPlatform={false}>
      <Head eyebrow="People and access" title="Team" />

      {e && ERRORS[e] && <p className="err banner-err">{ERRORS[e]}</p>}
      {newInvite && (
        <section className="card invite-ready">
          <h2>Invite ready for {String(newInvite.email)}</h2>
          <p className="muted">
            {emailed ? "We emailed this invite. You can also send the link yourself." : "Send this link by email or WhatsApp."} They sign in with that
            Google account and get {ROLE_LABEL[newInvite.role as Role]} access. The link works once and expires in 14 days.
          </p>
          <CopyField value={link(newInvite.token)} />
        </section>
      )}

      <div className="grid g2">
        <Card title="Invite someone">
          <form action="/api/team/invite" method="post" className="invite-form">
            <label htmlFor="inv-email">Email address (their Google account)</label>
            <input id="inv-email" name="email" type="email" required placeholder="name@example.com" />
            <label htmlFor="inv-role">Access</label>
            <select id="inv-role" name="role" defaultValue="viewer">
              <option value="viewer">Viewer: sees all reports</option>
              <option value="admin">Admin: also manages people and notes</option>
            </select>
            <fieldset className="sections">
              <legend>Can see (viewers)</legend>
              {SECTIONS.map(([path, label]) => (
                <label key={path}><input type="checkbox" name="sections" value={path} defaultChecked /> {label}</label>
              ))}
            </fieldset>
            <button type="submit">Create invite link</button>
          </form>
        </Card>
        <Card title="What each role can do">
          <div className="tbl">
            <table>
              <tbody>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <tr key={r}>
                    <td>{ROLE_LABEL[r]}</td>
                    <td style={{ textAlign: "left", whiteSpace: "normal" }}>{ROLE_HELP[r]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="People with access" src={`${users.length} ${users.length === 1 ? "person" : "people"}`}>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Person</th><th>Access</th><th style={{ textAlign: "left" }}>Can see</th><th>Last sign-in</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const locked = u.role === "owner" || u.id === me.id;
                return (
                  <tr key={String(u.id)}>
                    <td>
                      {String(u.name ?? u.email)}
                      {u.name ? <><br /><small className="muted">{String(u.email)}</small></> : null}
                      {u.id === me.id && <small className="muted"> (you)</small>}
                    </td>
                    <td>
                      {locked ? (
                        <span className="pill p-good">{ROLE_LABEL[u.role as Role]}</span>
                      ) : (
                        <details className="access-edit">
                          <summary className="mini-btn">{ROLE_LABEL[u.role as Role]} · Edit access</summary>
                          <form action={changeAccess} className="access-pop">
                            <input type="hidden" name="id" value={String(u.id)} />
                            <label htmlFor={`role-${u.id}`}>Role</label>
                            <select id={`role-${u.id}`} name="role" defaultValue={String(u.role)}>
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <fieldset className="sections">
                              <legend>Can see (viewers)</legend>
                              {SECTIONS.map(([path, label]) => {
                                const s = u.sections as string[] | null;
                                return (
                                  <label key={path}>
                                    <input type="checkbox" name="sections" value={path} defaultChecked={!s || s.includes(path)} /> {label}
                                  </label>
                                );
                              })}
                            </fieldset>
                            <button type="submit">Save access</button>
                          </form>
                        </details>
                      )}
                    </td>
                    <td style={{ textAlign: "left", whiteSpace: "normal" }} className="muted">
                      {u.role === "viewer" ? describeSections(u.sections as string[] | null) : "Everything"}
                    </td>
                    <td className="muted">{when(u.last_login_at)}</td>
                    <td>
                      {!locked && (
                        <form action={removeUser}>
                          <input type="hidden" name="id" value={String(u.id)} />
                          <ConfirmButton message={`Remove access for ${u.email}?`}>Remove</ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {invites.length > 0 && (
        <Card title="Pending invites" src="Not accepted yet">
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Email</th><th>Access</th><th style={{ textAlign: "left" }}>Can see</th><th>Invited by</th><th>Expires</th><th></th></tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={String(i.token)}>
                    <td>{String(i.email)}</td>
                    <td>{ROLE_LABEL[i.role as Role]}</td>
                    <td style={{ textAlign: "left", whiteSpace: "normal" }} className="muted">{describeSections(i.sections as string[] | null)}</td>
                    <td className="muted">{String(i.created_by)}</td>
                    <td className="muted">{when(i.expires_at)}</td>
                    <td className="row-actions">
                      <CopyField value={link(i.token)} compact />
                      <form action={revokeInvite}>
                        <input type="hidden" name="token" value={String(i.token)} />
                        <ConfirmButton message={`Cancel the invite for ${i.email}?`}>Cancel</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Change history" src="Last 50 changes and sign-ins, Pacific time" csv>
        {log.length ? (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>When</th><th>Who</th><th>What</th><th style={{ textAlign: "left" }}>Details</th></tr>
              </thead>
              <tbody>
                {log.map((l, i) => (
                  <tr key={i}>
                    <td className="muted">{when(l.at)}</td>
                    <td>{String(l.actor)}</td>
                    <td>{String(l.action)}</td>
                    <td style={{ textAlign: "left", whiteSpace: "normal" }}>{String(l.detail ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">No changes yet.</p>
        )}
      </Card>
    </Shell>
  );
}
