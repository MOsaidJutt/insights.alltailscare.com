import { Card, Head, Shell, osLabel } from "@/components/Shell";
import { Bar, Kpi, Stack } from "@/components/charts";
import { getAudience } from "@/lib/queries";
import { PERIODS, readParams, type SearchParams } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

type Row = { name: string; active: number; new: number };

function Table({ rows, label }: { rows: Row[]; label: string }) {
  const total = rows.reduce((a, r) => a + r.active, 0);
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr><th>{label}</th><th>Active users</th><th>Share</th><th></th><th>New users</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{fmtN(r.active)}</td>
              <td>{fmtPct(share(r.active, total), 0)}</td>
              <td style={{ width: "28%" }}><Bar pct={share(r.active, total)} /></td>
              <td>{fmtN(r.new)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Audience({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const P = PERIODS[period];
  const a = await getAudience(period, os);
  const androidNew = a.platform.find((p) => p.name === "Android")?.new ?? 0;

  return (
    <Shell active="/audience" period={period} os={os}>
      <Head eyebrow={`${P.span}${osLabel(os)}`} title="Who your users are" />

      <div className="grid g2">
        <Card title="Platform" src="Active users">
          <Stack parts={a.platform.map((p) => ({ label: p.name, value: p.active }))} />
        </Card>
        <div className="kpis">
          <Kpi label="Android uninstalls" value={fmtN(a.androidUninstalls)} note={`vs ${fmtN(androidNew)} new Android users. Android only; iPhone doesn’t report uninstalls.`} />
          <Kpi label="Countries" value={fmtN(a.country.length)} note="With active users in this period (top 12 shown)" />
        </div>
      </div>

      <div className="grid g2">
        <Card title="Countries" src="Google Analytics" csv>
          <Table rows={a.country} label="Country" />
        </Card>
        <Card title="App versions in use" src="Google Analytics" csv>
          <Table rows={a.version} label="Version" />
          <p className="note">Useful after a release, to check that most users have updated and new tracking is arriving.</p>
        </Card>
      </div>
    </Shell>
  );
}
