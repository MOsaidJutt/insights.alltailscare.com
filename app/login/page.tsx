import { login } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="login">
      <form action={login} className="card">
        <h1>AllTails Care Insights</h1>
        <label htmlFor="password" className="muted">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
        {e && <p className="err">That password isn’t right. Check it and try again.</p>}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
