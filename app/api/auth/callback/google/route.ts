import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, cookieOptions, signSession } from "@/lib/session";
import { signInWithGoogle } from "@/lib/users";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?e=${e}`, req.url));
  const code = q.get("code");
  if (q.get("error")) return fail("cancelled");
  if (!code || !q.get("state") || q.get("state") !== req.cookies.get("ati_oauth_state")?.value) return fail("state");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      redirect_uri: `${req.nextUrl.origin}/api/auth/callback/google`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const token = await tokenRes.json();
  if (!token.id_token) return fail("google");

  // The ID token came straight from Google's token endpoint over TLS, so its claims can be trusted as-is.
  const claims = JSON.parse(Buffer.from(String(token.id_token).split(".")[1], "base64url").toString());
  if (!claims.email || !claims.email_verified) return fail("unverified");

  const result = await signInWithGoogle({
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
    inviteToken: req.cookies.get("ati_invite")?.value,
  });
  if ("error" in result) {
    const res = fail(result.error);
    res.cookies.delete("ati_invite");
    return res;
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, await signSession(result.id), cookieOptions(SESSION_DAYS * 86_400));
  res.cookies.delete("ati_oauth_state");
  res.cookies.delete("ati_invite");
  return res;
}
