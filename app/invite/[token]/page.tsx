import { db, type Row } from "@/lib/db";
import { ROLE_HELP, ROLE_LABEL, type Role } from "@/lib/users";

export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sql = await db();
  const invite = ((await sql`SELECT email, role, created_by, expires_at, accepted_at FROM invites WHERE token = ${token}`) as Row[])[0];
  const valid = invite && !invite.accepted_at && new Date(invite.expires_at as string) > new Date();

  return (
    <main className="login">
      <div className="card login-card">
        <h1>AllTails Care Insights</h1>
        {valid ? (
          <>
            <p>
              <b>{String(invite.created_by)}</b> invited <b>{String(invite.email)}</b> to view the AllTails Care dashboard as{" "}
              <b>{ROLE_LABEL[invite.role as Role]}</b>.
            </p>
            <p className="muted">{ROLE_HELP[invite.role as Role]}</p>
            <a className="google-btn" href={`/api/auth/google?invite=${encodeURIComponent(token)}`}>
              Accept and sign in with Google
            </a>
            <p className="note">Use the Google account for {String(invite.email)}.</p>
          </>
        ) : (
          <p className="err">
            {invite ? "This invite has expired or was already used." : "This invite link isn’t valid."} Ask an admin for a new one.
          </p>
        )}
      </div>
    </main>
  );
}
