"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Row } from "@/lib/db";
import { ROLE_LABEL, audit, requireUser, type Role } from "@/lib/users";
import { describeSections, sectionsFromForm } from "@/lib/sections";

const assignable = (r: string): r is "admin" | "viewer" => r === "admin" || r === "viewer";

export async function revokeInvite(form: FormData) {
  const me = await requireUser("admin");
  const token = String(form.get("token") ?? "");
  const sql = await db();
  const rows = (await sql`DELETE FROM invites WHERE token = ${token} AND accepted_at IS NULL RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Cancelled invite", String(rows[0].email));
  revalidatePath("/team");
}

export async function changeAccess(form: FormData) {
  const me = await requireUser("admin");
  const id = Number(form.get("id"));
  const role = String(form.get("role") ?? "");
  if (!assignable(role) || id === me.id) redirect("/team?e=role");
  const sections = role === "viewer" ? sectionsFromForm(form) : null;
  const sql = await db();
  const rows = (await sql`UPDATE users SET role = ${role}, sections = ${sections} WHERE id = ${id} AND role <> 'owner' RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Changed access", `${rows[0].email} → ${ROLE_LABEL[role as Role]} · ${describeSections(sections)}`);
  revalidatePath("/team");
}

export async function removeUser(form: FormData) {
  const me = await requireUser("admin");
  const id = Number(form.get("id"));
  if (id === me.id) redirect("/team?e=self");
  const sql = await db();
  const rows = (await sql`DELETE FROM users WHERE id = ${id} AND role <> 'owner' RETURNING email`) as Row[];
  if (rows[0]) await audit(me.email, "Removed access", String(rows[0].email));
  revalidatePath("/team");
}
