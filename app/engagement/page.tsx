import { Card, Head, Shell, osLabel } from "@/components/Shell";
import { Bar } from "@/components/charts";
import { getEngagement } from "@/lib/queries";
import { NAV_TABS } from "@/lib/events";
import { PERIODS, readParams, type SearchParams } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

export default async function Engagement({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const P = PERIODS[period];
  const e = await getEngagement(period, os);
  const nav = Object.entries(NAV_TABS)
    .map(([event, label]) => {
      const stat = e.events.find((x) => x.name === event);
      return { label, users: stat?.users ?? 0, count: stat?.count ?? 0 };
    })
    .sort((a, b) => b.count - a.count);
  const maxNav = Math.max(...nav.map((n) => n.count), 1);

  return (
    <Shell active="/engagement" period={period} os={os}>
      <Head eyebrow={`${P.span}${osLabel(os)}`} title="What people do in the app" />

      <div className="grid g2">
        <Card title="Feature use" src={`Share of ${fmtN(e.activeUsers)} active users`} csv>
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Feature</th><th>People</th><th>Share</th><th></th><th>Times</th></tr>
              </thead>
              <tbody>
                {e.features.map((f) => (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    <td>{fmtN(f.users)}</td>
                    <td>{fmtPct(share(f.users, e.activeUsers), 0)}</td>
                    <td style={{ width: "30%" }}><Bar pct={share(f.users, e.activeUsers)} /></td>
                    <td>{fmtN(f.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Bottom menu taps" src="Which sections people open" csv>
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Section</th><th>Taps</th><th></th><th>People</th></tr>
              </thead>
              <tbody>
                {nav.map((n) => (
                  <tr key={n.label}>
                    <td>{n.label}</td>
                    <td>{fmtN(n.count)}</td>
                    <td style={{ width: "35%" }}><Bar pct={(n.count / maxNav) * 100} /></td>
                    <td>{fmtN(n.users)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            Onboarding screens are tracked as their own events (see the Funnel). In-app screens are measured by bottom menu taps.
          </p>
        </Card>
      </div>
    </Shell>
  );
}
