import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, randomToken } from "@/lib/session";

// Starts "Sign in with Google". An invite token, if present, rides along in a short-lived cookie.
export function GET(req: NextRequest) {
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?e=google", req.url));

  const state = randomToken(16);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${req.nextUrl.origin}/api/auth/callback/google`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("ati_oauth_state", state, cookieOptions(600));
  const invite = req.nextUrl.searchParams.get("invite");
  if (invite) res.cookies.set("ati_invite", invite, cookieOptions(600));
  return res;
}
