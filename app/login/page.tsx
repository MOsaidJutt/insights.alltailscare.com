import { login } from "./actions";

const ERRORS: Record<string, string> = {
  password: "That password isn’t right. Check it and try again.",
  notinvited: "This Google account hasn’t been invited yet. Ask an admin to invite you, then use the link they send.",
  mismatch: "This invite is for a different email address. Sign in with the Google account the invite was sent to.",
  expired: "This invite has expired or was already used. Ask an admin for a new one.",
  unverified: "Google hasn’t verified this account’s email address. Use a different Google account.",
  state: "The sign-in took too long or was interrupted. Try again.",
  google: "Google sign-in didn’t complete. Try again in a moment.",
  cancelled: "Sign-in was cancelled.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const google = Boolean(process.env.AUTH_GOOGLE_ID);
  return (
    <main className="login">
      <div className="card login-card">
        <div className="paw" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="#fff">
            <ellipse cx="6" cy="9" rx="2.2" ry="2.8" />
            <ellipse cx="10" cy="5.5" rx="2.2" ry="2.8" />
            <ellipse cx="14.5" cy="5.5" rx="2.2" ry="2.8" />
            <ellipse cx="18.5" cy="9" rx="2.2" ry="2.8" />
            <path d="M12.2 11c-3.4 0-6.2 3.6-6.2 6.3 0 1.9 1.6 2.7 3.2 2.7 1.3 0 2-.6 3-.6s1.7.6 3 .6c1.6 0 3.2-.8 3.2-2.7 0-2.7-2.8-6.3-6.2-6.3z" />
          </svg>
        </div>
        <h1>AllTails Care Insights</h1>
        {e && ERRORS[e] && <p className="err">{ERRORS[e]}</p>}
        {google && (
          <a className="google-btn" href="/api/auth/google">
            <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6C43.9 38 46.5 31.8 46.5 24.5z" />
              <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
            </svg>
            Sign in with Google
          </a>
        )}
        <details className="owner-login" open={!google || e === "password"}>
          <summary>{google ? "Owner password" : "Sign in"}</summary>
          <form action={login}>
            <label htmlFor="password" className="muted">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button type="submit">Sign in as owner</button>
          </form>
        </details>
        <p className="note">Team members sign in with the Google account their invite was sent to.</p>
      </div>
    </main>
  );
}
