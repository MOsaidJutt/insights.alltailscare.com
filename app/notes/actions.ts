"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, type Row } from "@/lib/db";
import { audit, requireUser } from "@/lib/users";

export async function addNote(form: FormData) {
  const me = await requireUser("admin");
  const date = String(form.get("date") ?? "");
  const text = String(form.get("text") ?? "").trim().slice(0, 140);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !text) redirect("/notes?e=1");
  const sql = await db();
  await sql`INSERT INTO notes (on_date, text, created_by) VALUES (${date}, ${text}, ${me.email})`;
  await audit(me.email, "Added note", `${date}: ${text}`);
  revalidatePath("/", "layout");
  redirect("/notes");
}

export async function deleteNote(form: FormData) {
  const me = await requireUser("admin");
  const sql = await db();
  const rows = (await sql`DELETE FROM notes WHERE id = ${Number(form.get("id"))} RETURNING on_date, text`) as Row[];
  if (rows[0]) await audit(me.email, "Deleted note", String(rows[0].text));
  revalidatePath("/", "layout");
}
