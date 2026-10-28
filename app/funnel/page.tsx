import { Card, Head, Shell, osLabel } from "@/components/Shell";
import { getConversion, getFunnel } from "@/lib/queries";
import { PERIODS, readParams, type SearchParams } from "@/lib/periods";
import { fmtN, fmtPct, share } from "@/lib/format";

export default async function Funnel({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const P = PERIODS[period];
  const [steps, conv] = await Promise.all([getFunnel(period, os), getConversion(period, os)]);
  const top = steps[0].total || 1;
  const lost = steps.map((s, i) => (i ? steps[i - 1].total - s.total : 0));
  const worst = lost.indexOf(Math.max(...lost));
  const account = steps.find((s) => s.label === "Created an account")!;

  return (
    <Shell active="/funnel" period={period} os={os}>
      <Head eyebrow={`${P.span}${osLabel(os)}`} title="Where new users drop off" />

      <Card title="Onboarding: from first open to the home screen" src="People whose first visit was in this period" csv>
        <div className="funnel">
          {steps.map((s, i) => (
            <div key={s.label} className={`fstep${i === worst && lost[i] > 0 ? " worst" : ""}`}>
              <span title={(s.events ?? s.prefixes ?? []).join(", ")}>
                {s.label}
                <br />
                <small className="muted">{s.screen}</small>
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
        {/* Hidden table so the CSV button can export the funnel. */}
        <table hidden>
          <tbody>
            <tr><th>Step</th><th>Screen</th><th>People</th><th>iPhone</th><th>Android</th></tr>
            {steps.map((s) => (
              <tr key={s.label}><td>{s.label}</td><td>{s.screen}</td><td>{s.total}</td><td>{s.ios}</td><td>{s.android}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="note">
          <b>{fmtPct(share(account.total, steps[0].total))}</b> of new users create an account and{" "}
          <b>{fmtPct(share(steps[steps.length - 1].total, steps[0].total))}</b> reach the home screen. A step can be slightly
          higher than the one before it when people go back or skip a screen.
        </p>
      </Card>

      <div className="grid g2">
        <Card title="iPhone vs Android" src="Share of new users reaching each step" csv>
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

        <Card title="Sign-up method" src="Started vs finished" csv>
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

      <Card title="Paywalls" src="Where the paywall is shown and what people do next" csv>
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
