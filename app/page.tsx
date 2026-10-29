import Link from "next/link";
import { Card, Head, Shell, osLabel } from "@/components/Shell";
import { Bar, Delta, Kpi, LineChart } from "@/components/charts";
import { byChannel, getAcquisition, getFunnel, getGrowth } from "@/lib/queries";
import { PERIODS, bucketKey, readParams, seriesLabel, type SearchParams } from "@/lib/periods";
import { getNotes } from "@/lib/notes";
import { change, fmtDur, fmtN, fmtPct, share } from "@/lib/format";

const trend = (v: number) => (Math.abs(v) < 0.5 ? "about the same as" : `${v > 0 ? "up" : "down"} ${Math.abs(v).toFixed(0)}%`);

export default async function Overview({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const P = PERIODS[period];
  const [g, funnel, sources, notes] = await Promise.all([
    getGrowth(period, os),
    getFunnel(period, os),
    getAcquisition(period, os),
    getNotes(),
  ]);
  const { cur, prev } = g;
  const channels = byChannel(sources);
  const totalNew = channels.reduce((a, c) => a + c.newUsers, 0);

  const step = (label: string) => funnel.find((s) => s.label === label)!;
  const opened = funnel[0];
  const paywall = step("Paywall");
  const account = step("Created an account");
  const home = step("Reached home");
  const keySteps = [opened, paywall, account, home];

  const drops = funnel.slice(1).map((s, i) => ({ from: funnel[i], to: s, lost: funnel[i].total - s.total }));
  const worst = drops.reduce((a, b) => (b.lost > a.lost ? b : a), drops[0]);
  const topChannel = channels[0];

  const highlights = [
    `${fmtN(cur.active)} people used the app (${P.span.toLowerCase()}), ${trend(change(cur.active, prev.active))} ${P.cmp}. ${fmtN(cur.new)} of them were new.`,
    topChannel &&
      `${topChannel.channel} brought the most new users: ${fmtPct(share(topChannel.newUsers, totalNew), 0)} of them, and ${fmtPct(share(topChannel.signups, topChannel.opened), 0)} of those created an account.`,
    worst.lost > 0 &&
      `The biggest drop for new users is from “${worst.from.label}” to “${worst.to.label}”: ${fmtN(worst.lost)} people (${fmtPct(share(worst.lost, worst.from.total), 0)}) stop there.`,
  ].filter(Boolean) as string[];

  const labels = g.series.map((s) => seriesLabel(P.seriesDim, s.key));
  const keys = g.series.map((s) => s.key);
  const shownNotes = notes.filter((n) => keys.includes(bucketKey(P.seriesDim, n.date)));
  const marks = shownNotes.map((n) => ({
    i: keys.indexOf(bucketKey(P.seriesDim, n.date)),
    text: `${n.date.slice(4, 6)}/${n.date.slice(6)}: ${n.text}`,
  }));
  const q = (path: string) => `${path}${period !== "monthly" || os !== "all" ? `?${new URLSearchParams({ ...(period !== "monthly" && { p: period }), ...(os !== "all" && { os }) })}` : ""}`;

  return (
    <Shell active="/" period={period} os={os}>
      <Head eyebrow={`${P.span} · ${P.cmp}${osLabel(os)}`} title="How AllTails is doing" />

      <div className="grid g3">
        <section className="card top-card">
          <div className="card-h">
            <h2>User growth</h2>
            <span className="src">Google Analytics</span>
          </div>
          <div className="big">{fmtN(cur.new)}</div>
          <div className="muted">new users <Delta value={change(cur.new, prev.new)} /></div>
          <div className="muted" style={{ marginTop: 4 }}>{fmtN(cur.active)} active users <Delta value={change(cur.active, prev.active)} /></div>
          <LineChart labels={labels} format={fmtN} area series={[{ name: "New users", values: g.series.map((s) => s.new), color: "--accent" }]} />
        </section>

        <section className="card top-card">
          <div className="card-h">
            <h2>Where new users come from</h2>
            <Link href={q("/acquisition")} className="src">All channels →</Link>
          </div>
          <div className="tbl">
            <table>
              <tbody>
                {channels.slice(0, 5).map((c) => (
                  <tr key={c.channel}>
                    <td>{c.channel}</td>
                    <td style={{ width: "38%" }}><Bar pct={share(c.newUsers, totalNew)} /></td>
                    <td>{fmtPct(share(c.newUsers, totalNew), 0)}</td>
                    <td className="muted">{fmtN(c.newUsers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card top-card">
          <div className="card-h">
            <h2>New-user funnel</h2>
            <Link href={q("/funnel")} className="src">Every step →</Link>
          </div>
          <div className="funnel compact">
            {keySteps.map((s) => (
              <div key={s.label} className="fstep">
                <span>{s.label}</span>
                <div className="fb"><i style={{ width: `${Math.max(share(s.total, opened.total), 6)}%` }}>{fmtN(s.total)}</i></div>
                <span className="drop">{fmtPct(share(s.total, opened.total), 0)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="highlights">
        <h2>Highlights</h2>
        <ol>
          {highlights.map((t, i) => (
            <li key={i}>
              <i>{i + 1}</i>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="kpis">
        <Kpi label="Active users" value={fmtN(cur.active)} note="Opened the app at least once" delta={<Delta value={change(cur.active, prev.active)} />} />
        <Kpi label="New users" value={fmtN(cur.new)} note="First time opening the app" delta={<Delta value={change(cur.new, prev.new)} />} />
        <Kpi label="Returning users" value={fmtN(cur.returning)} note="Active users who weren’t new" delta={<Delta value={change(cur.returning, prev.returning)} />} />
        <Kpi label="Sessions" value={fmtN(cur.sessions)} note="Times the app was opened" delta={<Delta value={change(cur.sessions, prev.sessions)} />} />
        <Kpi label="Sessions per user" value={cur.sessionsPerUser.toFixed(1)} note="Visits per active user" delta={<Delta value={change(cur.sessionsPerUser, prev.sessionsPerUser)} />} />
        <Kpi label="Time in app per user" value={fmtDur(cur.timePerUser)} note="Average engagement time" delta={<Delta value={change(cur.timePerUser, prev.timePerUser)} />} />
        <Kpi label="Stickiness" value={fmtPct(cur.stickiness)} note="Daily users ÷ monthly users" delta={<Delta value={cur.stickiness - prev.stickiness} unit=" pts" />} />
        <Kpi label="New users → account" value={fmtPct(share(account.total, opened.total))} note="Created an account" />
        <Kpi label="New users → home" value={fmtPct(share(home.total, opened.total))} note="Reached the home screen" />
      </div>

      <div className="grid g2">
        <Card title="Active and new users" src="Google Analytics">
          <LineChart
            labels={labels}
            format={fmtN}
            marks={marks}
            series={[
              { name: "Active users", values: g.series.map((s) => s.active), color: "--accent" },
              { name: "New users", values: g.series.map((s) => s.new), color: "--c2" },
            ]}
          />
        </Card>
        <Card title="Sessions" src="Google Analytics">
          <LineChart labels={labels} format={fmtN} marks={marks} series={[{ name: "Sessions", values: g.series.map((s) => s.sessions), color: "--accent-2" }]} />
        </Card>
      </div>

      {shownNotes.length > 0 && (
        <Card title="Notes in this period" src="Orange markers on the charts">
          <ul className="note-list">
            {shownNotes.map((n) => (
              <li key={n.id}>
                <b>{n.date.slice(4, 6)}/{n.date.slice(6)}</b> {n.text} <span className="muted">· {n.by}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Shell>
  );
}
