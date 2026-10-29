import { APP_URL, emailLayout, esc } from "./email";
import { getNotes } from "./notes";
import { concreteDate, PERIODS, type PeriodKey } from "./periods";
import { byChannel, getAcquisition, getFunnel, getGrowth } from "./queries";
import { change, fmtN, fmtPct, share } from "./format";

const TITLES: Record<PeriodKey, string> = { daily: "Daily report", weekly: "Weekly report", monthly: "Monthly report" };

const delta = (v: number) => {
  if (!Number.isFinite(v) || Math.abs(v) < 0.05) return `<span style="color:#5a716c">no change</span>`;
  const color = v > 0 ? "#23885a" : "#c9433f";
  return `<span style="color:${color};font-weight:600">${v > 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%</span>`;
};

const section = (title: string, inner: string) =>
  `<h2 style="margin:22px 0 8px;font-size:14px">${esc(title)}</h2>${inner}`;

const rows = (cells: string[][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">${cells
    .map(
      (c) =>
        `<tr>${c.map((v, i) => `<td style="padding:7px 0;border-bottom:1px solid #eef3f2;${i ? "text-align:right" : ""}">${v}</td>`).join("")}</tr>`,
    )
    .join("")}</table>`;

// Builds the scheduled report email from the same queries the dashboard uses.
export async function buildReport(period: PeriodKey) {
  const P = PERIODS[period];
  const [g, funnel, sources, notes] = await Promise.all([
    getGrowth(period, "all"),
    getFunnel(period, "all"),
    getAcquisition(period, "all"),
    getNotes(50),
  ]);
  const { cur, prev } = g;
  const channels = byChannel(sources);
  const totalNew = channels.reduce((a, c) => a + c.newUsers, 0);
  const step = (label: string) => funnel.find((s) => s.label === label)!;
  const opened = funnel[0];
  const keySteps = [opened, step("Paywall"), step("Created an account"), step("Reached home")];
  const from = concreteDate(P.cur.startDate);
  const to = concreteDate(P.cur.endDate);
  const periodNotes = notes.filter((n) => n.date >= from && n.date <= to);

  const tiles = [
    ["New users", fmtN(cur.new), delta(change(cur.new, prev.new))],
    ["Active users", fmtN(cur.active), delta(change(cur.active, prev.active))],
    ["Sessions", fmtN(cur.sessions), delta(change(cur.sessions, prev.sessions))],
  ];

  const body = `
<p style="margin:0;color:#5a716c;font-size:13px">${esc(P.span)} · ${esc(P.cmp)} · Pacific time</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
${tiles
  .map(
    ([l, v, d]) =>
      `<td width="33%" style="padding:12px;background:#f5f9f8;border-radius:10px"><div style="font-size:12px;color:#5a716c">${l}</div><div style="font-size:22px;font-weight:700">${v}</div><div style="font-size:12px">${d}</div></td>`,
  )
  .join('<td width="8"></td>')}
</tr></table>
${section(
  "Where new users came from",
  channels.length
    ? rows(channels.slice(0, 5).map((c) => [esc(c.channel), `${fmtN(c.newUsers)} · ${fmtPct(share(c.newUsers, totalNew), 0)}`]))
    : `<p style="font-size:13px;color:#5a716c">No new users in this period.</p>`,
)}
${section("New-user funnel", rows(keySteps.map((s) => [esc(s.label), `${fmtN(s.total)} · ${fmtPct(share(s.total, opened.total), 0)}`])))}
${periodNotes.length ? section("Notes", rows(periodNotes.map((n) => [`${n.date.slice(4, 6)}/${n.date.slice(6)}`, esc(n.text)]))) : ""}`;

  const subject = `AllTails ${TITLES[period].toLowerCase()}: ${fmtN(cur.new)} new users, ${fmtN(cur.active)} active`;
  return { subject, html: emailLayout(`${TITLES[period]} · ${P.span}`, body, { href: APP_URL, label: "Open the dashboard" }) };
}
