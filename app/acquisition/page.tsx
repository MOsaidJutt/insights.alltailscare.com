import { Card, Head, Shell } from "@/components/Shell";
import { Stack } from "@/components/charts";
import { getAcquisition } from "@/lib/queries";
import { PERIODS, periodFrom } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

function sourceName(source: string, medium: string) {
  if (source === "Apple" && medium === "search") return "Apple Search Ads";
  if (source === "google-play" && medium === "organic") return "Google Play organic";
  if (source === "(direct)") return "Direct / App Store organic";
  if (source === "(not set)") return "Unknown";
  return medium && medium !== "(none)" && medium !== "(not set)" ? `${source} / ${medium}` : source;
}

export default async function Acquisition({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const period = periodFrom((await searchParams).p);
  const P = PERIODS[period];
  const rows = (await getAcquisition(period)).filter((r) => r.newUsers > 0 || r.active > 0);
  const top = [...rows].sort((a, b) => b.newUsers - a.newUsers);
  const parts = top.slice(0, 5).map((r) => ({ label: sourceName(r.source, r.medium), value: r.newUsers }));
  const rest = top.slice(5).reduce((a, r) => a + r.newUsers, 0);
  if (rest > 0) parts.push({ label: "Everything else", value: rest });

  return (
    <Shell active="/acquisition" period={period}>
      <Head eyebrow={P.span} title="Where new users come from" />

      <Card title="Share of new users" src="Google Analytics · first user source">
        {parts.length ? <Stack parts={parts} /> : <p className="empty">No new users in this period.</p>}
      </Card>

      <Card title="Quality of users by source" src="Do they reach the paywall and create an account?">
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Source</th><th>New users</th><th>Active users</th><th>Reached paywall</th><th>Created account</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.source}|${r.medium}`}>
                  <td>{sourceName(r.source, r.medium)}</td>
                  <td>{fmtN(r.newUsers)}</td>
                  <td>{fmtN(r.active)}</td>
                  <td>{r.opened ? fmtPct(share(r.paywall, r.opened), 0) : "–"}</td>
                  <td>{r.opened ? fmtPct(share(r.signups, r.opened), 0) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          <b>Apple Search Ads</b> installs are identified by Apple’s ad attribution. Other iPhone installs show as{" "}
          <b>Direct</b>, because Google Analytics can’t tell App Store search from browsing. That split, plus ad spend and cost
          per install, comes from App Store Connect and Apple Ads in a later milestone. Percentages are out of people who opened
          the app for the first time.
        </p>
      </Card>
    </Shell>
  );
}
