import { Card, Head, Shell } from "@/components/Shell";
import { getConversion, getFunnel } from "@/lib/queries";
import { PERIODS, periodFrom } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

export default async function Funnel({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const period = periodFrom((await searchParams).p);
  const P = PERIODS[period];
  const [steps, conv] = await Promise.all([getFunnel(period), getConversion(period)]);
  const top = steps[0].total || 1;
  const lost = steps.map((s, i) => (i ? steps[i - 1].total - s.total : 0));
  const worst = lost.indexOf(Math.max(...lost));

  return (
    <Shell active="/funnel" period={period}>
      <Head eyebrow={P.span} title="Where users drop off" />

      <Card title="Onboarding: from first open to account" src="Unique users who reached each step">
        <div className="funnel">
          {steps.map((s, i) => (
            <div key={s.label} className={`fstep${i === worst && lost[i] > 0 ? " worst" : ""}`}>
              <span>
                {s.label}
                <br />
                <code>{s.events.length > 1 ? "sign-up completed (Apple, Google, email)" : s.events[0]}</code>
              </span>
              <div className="fb">
                <i style={{ width: `${Math.max((s.total / top) * 100, 6)}%` }}>{fmtN(s.total)}</i>
              </div>
              <span className="drop">
                {i === 0 ? "start" : lost[i] <= 0 ? "no drop" : (
                  <>
                    <b>−{fmtPct(share(lost[i], steps[i - 1].total), 0)}</b> · {fmtN(lost[i])} lost
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="note">
          Overall, <b>{fmtPct(share(steps[steps.length - 1].total, steps[0].total))}</b> of people who open the app for the first
          time create an account. Counts are people who triggered each step in the period, so a step can be slightly higher than
          the one before it.
        </p>
      </Card>

      <div className="grid g2">
        <Card title="iPhone vs Android" src="Share of first opens reaching each step">
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Step</th><th>iPhone</th><th>Android</th></tr>
              </thead>
              <tbody>
                {steps.slice(1).map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td>{fmtPct(share(s.ios, steps[0].ios), 0)}</td>
                    <td>{fmtPct(share(s.android, steps[0].android), 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Sign-up method" src="Started vs finished">
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Method</th><th>Started</th><th>Finished</th><th>Failed</th><th>Success</th></tr>
              </thead>
              <tbody>
                {conv.signups.map((m) => {
                  const rate = share(m.completed, m.tapped);
                  return (
                    <tr key={m.label}>
                      <td>{m.label}</td>
                      <td>{fmtN(m.tapped)}</td>
                      <td>{fmtN(m.completed)}</td>
                      <td>{fmtN(m.failed)}</td>
                      <td><span className={`pill p-${rate >= 85 ? "good" : rate >= 70 ? "warn" : "bad"}`}>{fmtPct(rate, 0)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">Failed sign-ups usually mean a technical or permission problem worth passing to the developer.</p>
        </Card>
      </div>

      <Card title="Paywalls" src="Where the paywall is shown and what people do next">
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Paywall</th><th>Saw it</th><th>Tapped continue</th><th>Closed or skipped</th><th>Purchases</th><th>Purchase rate</th></tr>
            </thead>
            <tbody>
              {conv.paywalls.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td>{fmtN(p.views)}</td>
                  <td>{fmtN(p.continued)}</td>
                  <td>{fmtN(p.skipped)}</td>
                  <td>{fmtN(p.purchases)}</td>
                  <td>{p.views ? fmtPct(share(p.purchases, p.views)) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Purchases here come from the app’s own events, which miss some sales. Exact revenue, trials and renewals come from
          RevenueCat in the next milestone.
        </p>
      </Card>
    </Shell>
  );
}
