// Runs in both middleware (edge) and server actions, so it uses Web Crypto only.
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${password}:${process.env.AUTH_SECRET ?? ""}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const AUTH_COOKIE = "ati_auth";
