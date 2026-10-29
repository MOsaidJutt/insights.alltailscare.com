// Signed session cookie. Uses Web Crypto only, so it runs in middleware (edge) and on the server.

export const SESSION_COOKIE = "ati_session";
export const SESSION_DAYS = 30;

export type Session = { uid: number; exp: number };

const enc = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

const key = () => crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

const b64u = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function signSession(uid: number): Promise<string> {
  const body = b64u(enc.encode(JSON.stringify({ uid, exp: Date.now() + SESSION_DAYS * 86_400_000 })));
  const sig = b64u(await crypto.subtle.sign("HMAC", await key(), enc.encode(body)));
  return `${body}.${sig}`;
}

export async function readSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify("HMAC", await key(), fromB64u(sig), enc.encode(body)))) return null;
    const s = JSON.parse(new TextDecoder().decode(fromB64u(body))) as Session;
    return typeof s.uid === "number" && s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: maxAgeSeconds,
  path: "/",
});

export function randomToken(bytes = 24): string {
  return b64u(crypto.getRandomValues(new Uint8Array(bytes)));
}
