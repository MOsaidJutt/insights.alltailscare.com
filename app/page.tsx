import { Card, Head, Shell } from "@/components/Shell";
import { Delta, Kpi, LineChart, Stack } from "@/components/charts";
import { getFunnel, getGrowth } from "@/lib/queries";
import { PERIODS, periodFrom, seriesLabel } from "@/lib/periods";
import { change, fmtDur, fmtN, fmtPct, share } from "@/lib/format";

const trend = (v: number) => (Math.abs(v) < 0.5 ? "about the same as" : `${v > 0 ? "up" : "down"} ${Math.abs(v).toFixed(0)}%`);

export default async function Growth({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const period = periodFrom((await searchParams).p);
  const P = PERIODS[period];
  const [g, funnel] = await Promise.all([getGrowth(period), getFunnel(period)]);
  const { cur, prev } = g;

  const opened = funnel[0];
  const paywall = funnel[funnel.length - 2];
  const signedUp = funnel[funnel.length - 1];
  const drops = funnel.slice(1).map((s, i) => ({ from: funnel[i], to: s, lost: funnel[i].total - s.total }));
  const worst = drops.reduce((a, b) => (b.lost > a.lost ? b : a), drops[0]);

  const highlights = [
    `${fmtN(cur.active)} people used the app (${P.span.toLowerCase()}), ${trend(change(cur.active, prev.active))} ${P.cmp}. ${fmtN(cur.new)} of them were new.`,
    worst.lost > 0 &&
      `The biggest drop in onboarding is from “${worst.from.label}” to “${worst.to.label}”: ${fmtN(worst.lost)} people (${fmtPct(share(worst.lost, worst.from.total), 0)}) stop there.`,
    paywall.total > 0 &&
      `After the onboarding paywall, ${fmtPct(share(signedUp.ios, paywall.ios), 0)} of iPhone users and ${fmtPct(share(signedUp.android, paywall.android), 0)} of Android users create an account.`,
  ].filter(Boolean) as string[];

  const labels = g.series.map((s) => seriesLabel(P.seriesDim, s.key));

  return (
    <Shell active="/" period={period}>
      <Head eyebrow={`${P.span} · ${P.cmp}`} title="How AllTails is growing" />

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
        <Kpi label="Reached the paywall" value={fmtPct(share(paywall.total, opened.total))} note="Of people who opened the app" />
        <Kpi label="Paywall → account" value={fmtPct(share(signedUp.total, paywall.total))} note="Created an account after the paywall" />
      </div>

      <div className="grid g2">
        <Card title="Active and new users" src="Google Analytics">
          <LineChart
            labels={labels}
            format={fmtN}
            series={[
              { name: "Active users", values: g.series.map((s) => s.active), color: "--accent" },
              { name: "New users", values: g.series.map((s) => s.new), color: "--c2" },
            ]}
          />
        </Card>
        <Card title="Sessions" src="Google Analytics">
          <LineChart labels={labels} format={fmtN} series={[{ name: "Sessions", values: g.series.map((s) => s.sessions), color: "--accent-2" }]} />
        </Card>
      </div>

      <Card title="Active users by platform" src={P.span}>
        <Stack parts={g.platform.map((p) => ({ label: p.name, value: p.users }))} />
      </Card>
    </Shell>
  );
}
