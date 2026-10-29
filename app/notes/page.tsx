import { Card, Head, Shell } from "@/components/Shell";
import { ConfirmButton } from "@/components/Tools";
import { getNotes } from "@/lib/notes";
import { ptToday, ymd } from "@/lib/periods";
import { canManage, requireUser } from "@/lib/users";
import { addNote, deleteNote } from "./actions";

const pretty = (d: string) =>
  new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function Notes({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const me = await requireUser();
  const { e } = await searchParams;
  const notes = await getNotes();
  const admin = canManage(me);

  return (
    <Shell active="/notes" period="monthly" showPeriod={false} showPlatform={false}>
      <Head eyebrow="Annotations" title="Notes on the charts" />

      {admin && (
        <Card title="Add a note">
          <form action={addNote} className="note-form">
            <div>
              <label htmlFor="note-date">Date</label>
              <input id="note-date" name="date" type="date" required defaultValue={ymd(ptToday())} />
            </div>
            <div className="grow">
              <label htmlFor="note-text">What happened</label>
              <input id="note-text" name="text" required maxLength={140} placeholder="e.g. TikTok test campaign started, App v3.4 released" />
            </div>
            <button type="submit">Add note</button>
          </form>
          {e && <p className="err">Add a date and a short description.</p>}
          <p className="note">Notes show as markers on the Overview charts, so everyone can see what moved the numbers.</p>
        </Card>
      )}

      <Card title="All notes" src={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`} csv>
        {notes.length ? (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Date</th><th style={{ textAlign: "left" }}>Note</th><th>Added by</th>{admin && <th></th>}</tr>
              </thead>
              <tbody>
                {notes.map((n) => (
                  <tr key={n.id}>
                    <td>{pretty(n.date)}</td>
                    <td style={{ textAlign: "left", whiteSpace: "normal" }}>{n.text}</td>
                    <td className="muted">{n.by}</td>
                    {admin && (
                      <td>
                        <form action={deleteNote}>
                          <input type="hidden" name="id" value={n.id} />
                          <ConfirmButton message="Delete this note?">Delete</ConfirmButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">No notes yet. {admin ? "Add the first one above, for example a campaign launch." : "Admins can add them."}</p>
        )}
      </Card>
    </Shell>
  );
}
