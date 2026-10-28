import Link from "next/link";
import { Card, Head, Shell, osLabel } from "@/components/Shell";
import { Stack } from "@/components/charts";
import { byChannel, getAcquisition } from "@/lib/queries";
import { CHANNEL_NOTES } from "@/lib/channels";
import { PERIODS, readParams, type SearchParams } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

const rate = (part: number, whole: number) => (whole ? fmtPct(share(part, whole), 0) : "–");

function campaignName(c: { source: string; medium: string; campaign: string }) {
  if (c.source === "Apple" && c.medium === "search") return `Apple Ads campaign ${c.campaign}`;
  const camp = c.campaign && !c.campaign.startsWith("(") ? ` · ${c.campaign}` : "";
  return `${c.source} / ${c.medium}${camp}`;
}

export default async function Acquisition({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const P = PERIODS[period];
  const rows = (await getAcquisition(period, os)).filter((r) => r.newUsers > 0 || r.active > 0);
  const channels = byChannel(rows);
  const campaigns = [...rows].sort((a, b) => b.newUsers - a.newUsers);

  return (
    <Shell active="/acquisition" period={period} os={os}>
      <Head eyebrow={`${P.span}${osLabel(os)}`} title="Where new users come from">
        <Link href="/links" className="src">Create a tracked link for a new channel →</Link>
      </Head>

      <Card title="Share of new users by channel" src="Google Analytics · first user source">
        {channels.length ? (
          <Stack parts={channels.map((c) => ({ label: c.channel, value: c.newUsers }))} />
        ) : (
          <p className="empty">No new users in this period.</p>
        )}
      </Card>

      <Card title="Channels" src="Do new users reach the paywall and create an account?" csv>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Channel</th><th>New users</th><th>Share</th><th>Reached paywall</th><th>Created account</th></tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel}>
                  <td>
                    {c.channel}
                    {CHANNEL_NOTES[c.channel] && <><br /><small className="muted">{CHANNEL_NOTES[c.channel]}</small></>}
                  </td>
                  <td>{fmtN(c.newUsers)}</td>
                  <td>{rate(c.newUsers, channels.reduce((a, x) => a + x.newUsers, 0))}</td>
                  <td>{rate(c.paywall, c.opened)}</td>
                  <td>{rate(c.signups, c.opened)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          TikTok, Meta, AppLovin and partner rows appear automatically once people install through a{" "}
          <Link href="/links">tracked link</Link>. Paid networks report most accurately through a mobile attribution tool
          (such as AppsFlyer, Adjust or Branch), which can be connected later.
        </p>
      </Card>

      <Card title="Campaigns and sources" src="Every source GA recorded" csv>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Source</th><th>Channel</th><th>New users</th><th>Active users</th><th>Reached paywall</th><th>Created account</th></tr>
            </thead>
            <tbody>
              {campaigns.map((r) => (
                <tr key={`${r.source}|${r.medium}|${r.campaign}`}>
                  <td>{campaignName(r)}</td>
                  <td className="muted">{r.channel}</td>
                  <td>{fmtN(r.newUsers)}</td>
                  <td>{fmtN(r.active)}</td>
                  <td>{rate(r.paywall, r.opened)}</td>
                  <td>{rate(r.signups, r.opened)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">Apple Ads campaigns show as numbers for now. Their names come through when Apple Ads is connected.</p>
      </Card>
    </Shell>
  );
}
