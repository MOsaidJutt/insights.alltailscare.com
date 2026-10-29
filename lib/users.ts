import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, type Row } from "./db";
import { SESSION_COOKIE, readSession } from "./session";

export type Role = "owner" | "admin" | "viewer";
export type User = { id: number; email: string; name: string | null; picture: string | null; role: Role; sections: string[] | null };

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", viewer: "Viewer" };
export const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including managing admins. There is one owner.",
  admin: "Sees all reports, invites and removes people, manages notes and email reports.",
  viewer: "Sees the reports you choose (all, or specific sections). Can’t change anything.",
};

const rank = (r: Role) => (r === "owner" ? 3 : r === "admin" ? 2 : 1);
export const canManage = (u: User) => rank(u.role) >= 2;
export const canSee = (u: User, path: string) => canManage(u) || !u.sections || u.sections.includes(path);
export const ownerEmail = () => (process.env.OWNER_EMAIL ?? "anjali@alltailscare.com").toLowerCase();

export async function currentUser(): Promise<User | null> {
  const s = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const sql = await db();
  const rows = (await sql`SELECT id, email, name, picture, role, sections FROM users WHERE id = ${s.uid}`) as Row[];
  return (rows[0] as User | undefined) ?? null;
}

export async function requireUser(minRole: Role = "viewer"): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (rank(u.role) < rank(minRole)) redirect("/");
  return u;
}

export async function audit(actor: string, action: string, detail = "") {
  const sql = await db();
  await sql`INSERT INTO audit (actor, action, detail) VALUES (${actor}, ${action}, ${detail})`;
}

async function upsertOwner(profile: { name?: string; picture?: string }): Promise<number> {
  const sql = await db();
  const rows = (await sql`
    INSERT INTO users (email, name, picture, role, last_login_at)
    VALUES (${ownerEmail()}, ${profile.name ?? null}, ${profile.picture ?? null}, 'owner', now())
    ON CONFLICT (email) DO UPDATE SET
      role = 'owner',
      name = COALESCE(EXCLUDED.name, users.name),
      picture = COALESCE(EXCLUDED.picture, users.picture),
      last_login_at = now()
    RETURNING id`) as Row[];
  return rows[0].id as number;
}

export async function signInOwnerWithPassword(): Promise<number> {
  const id = await upsertOwner({});
  await audit(ownerEmail(), "Signed in", "Owner password");
  return id;
}

export type SignInResult = { id: number } | { error: "notinvited" | "mismatch" | "expired" };

// Decides whether a Google account may sign in: existing member, the owner, or someone with a valid invite.
export async function signInWithGoogle(p: {
  email: string;
  name?: string;
  picture?: string;
  inviteToken?: string;
}): Promise<SignInResult> {
  const sql = await db();
  const email = p.email.toLowerCase();

  if (email === ownerEmail()) {
    const id = await upsertOwner(p);
    await audit(email, "Signed in", "Google");
    return { id };
  }

  const existing = (await sql`
    UPDATE users SET name = ${p.name ?? null}, picture = ${p.picture ?? null}, last_login_at = now()
    WHERE email = ${email} RETURNING id`) as Row[];
  if (existing[0]) {
    await audit(email, "Signed in", "Google");
    return { id: existing[0].id as number };
  }

  let invite: Row | undefined;
  if (p.inviteToken) {
    invite = ((await sql`SELECT * FROM invites WHERE token = ${p.inviteToken}`) as Row[])[0];
    if (invite && String(invite.email).toLowerCase() !== email) return { error: "mismatch" };
  }
  invite ??= ((await sql`
    SELECT * FROM invites WHERE lower(email) = ${email} AND accepted_at IS NULL
    ORDER BY created_at DESC LIMIT 1`) as Row[])[0];
  if (!invite) return { error: "notinvited" };
  if (invite.accepted_at || new Date(invite.expires_at as string) < new Date()) return { error: "expired" };

  const created = (await sql`
    INSERT INTO users (email, name, picture, role, sections, last_login_at)
    VALUES (${email}, ${p.name ?? null}, ${p.picture ?? null}, ${invite.role as string}, ${(invite.sections as string[] | null) ?? null}, now())
    RETURNING id`) as Row[];
  await sql`UPDATE invites SET accepted_at = now() WHERE token = ${invite.token as string}`;
  await audit(email, "Accepted invite", `${ROLE_LABEL[invite.role as Role]}, invited by ${invite.created_by}`);
  return { id: created[0].id as number };
}
