import { db, type Row } from "./db";

export type Note = { id: number; date: string; text: string; by: string };

// Dates come back as YYYYMMDD strings so they line up with GA's date keys.
export async function getNotes(limit = 200): Promise<Note[]> {
  const sql = await db();
  const rows = (await sql`
    SELECT id, to_char(on_date, 'YYYYMMDD') AS d, text, created_by
    FROM notes ORDER BY on_date DESC, id DESC LIMIT ${limit}`) as Row[];
  return rows.map((r) => ({ id: r.id as number, date: String(r.d), text: String(r.text), by: String(r.created_by ?? "") }));
}
