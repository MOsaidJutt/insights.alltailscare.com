import { Card, Head, Shell } from "@/components/Shell";
import { LineChart } from "@/components/charts";
import { getRetention } from "@/lib/queries";
import { periodFrom, shortDate } from "@/lib/periods";
import { fmtN, fmtPct } from "@/lib/format";

export default async function Retention({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const period = periodFrom((await searchParams).p);
  const cohorts = await getRetention();
  const weeks = cohorts[0]?.weeks.length ?? 0;
  const avg = Array.from({ length: weeks }, (_, n) => {
    const vals = cohorts.filter((c) => c.size > 0 && c.weeks[n] !== null).map((c) => c.weeks[n] as number);
    return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
  }).filter((v): v is number => v !== null);

  return (
    <Shell active="/retention" period={period} showPeriod={false}>
      <Head eyebrow="Grouped by the week people installed" title="Do users come back?" />

      <div className="grid g2">
        <Card title="Average retention curve" src="Share of each week’s new users still active">
          <LineChart
            labels={avg.map((_, i) => (i === 0 ? "Install week" : `Week ${i}`))}
            format={(v) => `${v.toFixed(0)}%`}
            series={[{ name: "Still active", values: avg, color: "--accent" }]}
          />
        </Card>

        <Card title="By install week" src="Google Analytics cohorts">
          <div className="tbl">
            <table className="heat">
              <thead>
                <tr>
                  <th>Installed</th>
                  <th>Users</th>
                  {Array.from({ length: weeks - 1 }, (_, i) => (
                    <th key={i} style={{ textAlign: "center" }}>Week {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.start.toISOString()}>
                    <td>{shortDate(c.start)}–{shortDate(c.end)}</td>
                    <td>{fmtN(c.size)}</td>
                    {c.weeks.slice(1).map((v, i) =>
                      v === null ? (
                        <td key={i} className="muted">–</td>
                      ) : (
                        <td
                          key={i}
                          style={{
                            background: `color-mix(in srgb, var(--accent) ${Math.min(Math.round(v * 1.8), 90)}%, transparent)`,
                            color: v > 30 ? "#fff" : "var(--fg)",
                          }}
                        >
                          {fmtPct(v, 0)}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">“Week 1” is the week after install. A dash means that week hasn’t finished yet.</p>
        </Card>
      </div>
    </Shell>
  );
}
