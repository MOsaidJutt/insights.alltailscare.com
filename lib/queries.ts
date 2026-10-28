import { runReport, type Report } from "./ga";
import { PERIODS, concreteDate, ptToday, ymd, type Os, type PeriodKey, type Range } from "./periods";
import { FEATURES, ONBOARDING_FUNNEL, PAYWALL_PLACEMENTS, SIGNUP_COMPLETED, SIGNUP_METHODS, type Step } from "./events";
import { channelOf, type Channel } from "./channels";

type Filter = Record<string, unknown>;

const names = (...n: string[]) => n.map((name) => ({ name }));
const exact = (fieldName: string, value: string): Filter => ({
  filter: { fieldName, stringFilter: { matchType: "EXACT", value } },
});
const inList = (values: string[]): Filter => ({ filter: { fieldName: "eventName", inListFilter: { values } } });
const beginsWith = (value: string): Filter => ({
  filter: { fieldName: "eventName", stringFilter: { matchType: "BEGINS_WITH", value } },
});
const stepFilter = (s: Step): Filter =>
  s.prefixes ? { orGroup: { expressions: s.prefixes.map(beginsWith) } } : inList(s.events ?? []);

// Adds the iOS / Android filter to any report filter.
function scope(os: Os, f?: Filter): Filter | undefined {
  const parts = [f, os === "all" ? undefined : exact("platform", os === "ios" ? "iOS" : "Android")].filter(
    (x): x is Filter => Boolean(x),
  );
  if (!parts.length) return undefined;
  return parts.length === 1 ? parts[0] : { andGroup: { expressions: parts } };
}

/* ---------- Growth ---------- */

// GA returns inflated user counts when several date ranges share one request,
// so each period gets its own query. Stickiness = average daily users ÷ users in the 30 days to the period end.
async function periodKpis(range: Range, monthEnding: Range, os: Os) {
  const dimensionFilter = scope(os);
  const [totals, daily, month] = await Promise.all([
    runReport({ dateRanges: [range], metrics: names("activeUsers", "newUsers", "sessions", "userEngagementDuration"), dimensionFilter }),
    runReport({ dateRanges: [range], dimensions: names("date"), metrics: names("activeUsers"), dimensionFilter, limit: 100 }),
    runReport({ dateRanges: [monthEnding], metrics: names("activeUsers"), dimensionFilter }),
  ]);
  const [active = 0, newUsers = 0, sessions = 0, engagement = 0] = totals.rows[0]?.m ?? [];
  const avgDaily = daily.rows.length ? daily.rows.reduce((a, r) => a + r.m[0], 0) / daily.rows.length : 0;
  const mau = month.rows[0]?.m[0] ?? 0;
  return {
    active,
    new: newUsers,
    returning: Math.max(active - newUsers, 0),
    sessions,
    sessionsPerUser: active ? sessions / active : 0,
    timePerUser: active ? engagement / active : 0,
    stickiness: mau ? (avgDaily / mau) * 100 : 0,
  };
}

export async function getGrowth(p: PeriodKey, os: Os) {
  const P = PERIODS[p];
  const [cur, prev, series, platform] = await Promise.all([
    periodKpis(P.cur, { startDate: "30daysAgo", endDate: P.cur.endDate }, os),
    periodKpis(P.prev, { startDate: `${Number(P.prev.endDate.replace(/\D/g, "")) + 29}daysAgo`, endDate: P.prev.endDate }, os),
    runReport({
      dateRanges: [{ startDate: P.seriesStart, endDate: "yesterday" }],
      dimensions: names(P.seriesDim),
      metrics: names("activeUsers", "newUsers", "sessions"),
      dimensionFilter: scope(os),
      orderBys: [{ dimension: { dimensionName: P.seriesDim } }],
      limit: 400,
    }),
    runReport({ dateRanges: [P.cur], dimensions: names("platform"), metrics: names("activeUsers"), dimensionFilter: scope(os) }),
  ]);
  return {
    cur,
    prev,
    series: series.rows.map((r) => ({ key: r.d[0], active: r.m[0], new: r.m[1], sessions: r.m[2] })),
    platform: platform.rows.map((r) => ({ name: r.d[0], users: r.m[0] })),
  };
}

/* ---------- Funnel ---------- */

export type FunnelStep = Step & { total: number; ios: number; android: number };

// New-user funnel: only people whose first session falls inside the period, so
// "Reached home" isn't inflated by existing users.
// GA runs 10 requests per property at a time, so every exact-name step shares one query
// and the prefix steps get one each (2 queries instead of 16).
export async function getFunnel(p: PeriodKey, os: Os): Promise<FunnelStep[]> {
  const P = PERIODS[p];
  const from = concreteDate(P.cur.startDate);
  const to = concreteDate(P.cur.endDate);
  const newUsers = (rows: Report["rows"], dateCol: number) => rows.filter((r) => r.d[dateCol] >= from && r.d[dateCol] <= to);
  const exactEvents = ONBOARDING_FUNNEL.flatMap((s) => s.events ?? []);
  const prefixSteps = ONBOARDING_FUNNEL.filter((s) => s.prefixes);
  const [byEvent, ...byPrefix] = await Promise.all([
    runReport({
      dateRanges: [P.cur],
      dimensions: names("eventName", "platform", "firstSessionDate"),
      metrics: names("totalUsers"),
      dimensionFilter: scope(os, inList(exactEvents)),
      limit: 5000,
    }),
    ...prefixSteps.map((s) =>
      runReport({
        dateRanges: [P.cur],
        dimensions: names("platform", "firstSessionDate"),
        metrics: names("totalUsers"),
        dimensionFilter: scope(os, stepFilter(s)),
        limit: 1000,
      }),
    ),
  ]);
  const eventRows = newUsers(byEvent.rows, 2);
  return ONBOARDING_FUNNEL.map((s) => {
    // Rows as [platform, users]. Sign-up sums three events; people rarely finish more than one method.
    const rows: [string, number][] = s.prefixes
      ? newUsers(byPrefix[prefixSteps.indexOf(s)].rows, 1).map((r) => [r.d[0], r.m[0]])
      : eventRows.filter((r) => s.events!.includes(r.d[0])).map((r) => [r.d[1], r.m[0]]);
    const on = (platform: string) => rows.filter(([pl]) => pl === platform).reduce((a, [, n]) => a + n, 0);
    return { ...s, total: rows.reduce((a, [, n]) => a + n, 0), ios: on("iOS"), android: on("Android") };
  });
}

export type EventStat = { name: string; count: number; users: number };

export async function getEvents(range: Range, os: Os): Promise<EventStat[]> {
  const r = await runReport({
    dateRanges: [range],
    dimensions: names("eventName"),
    metrics: names("eventCount", "totalUsers"),
    dimensionFilter: scope(os),
    limit: 1000,
  });
  return r.rows.map((x) => ({ name: x.d[0], count: x.m[0], users: x.m[1] }));
}

export async function getConversion(p: PeriodKey, os: Os) {
  const events = await getEvents(PERIODS[p].cur, os);
  const sum = (test: (n: string) => boolean, field: "users" | "count" = "users") =>
    events.filter((e) => test(e.name)).reduce((a, e) => a + e[field], 0);

  const paywalls = PAYWALL_PLACEMENTS.map((pl) => {
    const has = (n: string) => n.includes(pl.key);
    return {
      label: pl.label,
      views: sum((n) => n === pl.view),
      continued: sum((n) => (n.startsWith("paywall_continue_") || n.startsWith("pw_continue_")) && has(n)),
      skipped: sum((n) => n.startsWith("paywall_skip_") && !n.includes("failed") && has(n)),
      purchases: sum((n) => n.startsWith("purchase_") && has(n), "count"),
    };
  });

  const signups = SIGNUP_METHODS.map((m) => ({
    label: m.label,
    tapped: sum((n) => n === `auth_register_${m.key}_tapped`),
    completed: sum((n) => n === `auth_register_${m.key}_completed`),
    failed: sum((n) => n === `auth_register_${m.key}_failed`),
  }));

  return { paywalls, signups };
}

/* ---------- Acquisition ---------- */

export type SourceRow = {
  source: string;
  medium: string;
  campaign: string;
  channel: Channel;
  newUsers: number;
  active: number;
  opened: number;
  paywall: number;
  signups: number;
};

export async function getAcquisition(p: PeriodKey, os: Os): Promise<SourceRow[]> {
  const P = PERIODS[p];
  const dims = names("firstUserSource", "firstUserMedium", "firstUserCampaignName");
  const [sources, quality] = await Promise.all([
    runReport({
      dateRanges: [P.cur],
      dimensions: dims,
      metrics: names("newUsers", "activeUsers"),
      dimensionFilter: scope(os),
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 100,
    }),
    runReport({
      dateRanges: [P.cur],
      dimensions: [...dims, { name: "eventName" }],
      metrics: names("totalUsers"),
      dimensionFilter: scope(os, inList(["first_open", "paywall_viewed_onboarding", ...SIGNUP_COMPLETED])),
      limit: 2000,
    }),
  ]);
  const key = (d: string[]) => `${d[0]}|${d[1]}|${d[2]}`;
  const q = (k: string, test: (e: string) => boolean) =>
    quality.rows.filter((r) => key(r.d) === k && test(r.d[3])).reduce((a, r) => a + r.m[0], 0);
  return sources.rows.map((r) => {
    const k = key(r.d);
    return {
      source: r.d[0],
      medium: r.d[1],
      campaign: r.d[2],
      channel: channelOf(r.d[0], r.d[1]),
      newUsers: r.m[0],
      active: r.m[1],
      opened: q(k, (e) => e === "first_open"),
      paywall: q(k, (e) => e === "paywall_viewed_onboarding"),
      signups: q(k, (e) => SIGNUP_COMPLETED.includes(e)),
    };
  });
}

export type ChannelRow = Omit<SourceRow, "source" | "medium" | "campaign"> & { campaigns: SourceRow[] };

export function byChannel(rows: SourceRow[]): ChannelRow[] {
  const map = new Map<Channel, ChannelRow>();
  for (const r of rows) {
    const c = map.get(r.channel) ?? { channel: r.channel, newUsers: 0, active: 0, opened: 0, paywall: 0, signups: 0, campaigns: [] };
    c.newUsers += r.newUsers;
    c.active += r.active;
    c.opened += r.opened;
    c.paywall += r.paywall;
    c.signups += r.signups;
    c.campaigns.push(r);
    map.set(r.channel, c);
  }
  return [...map.values()].sort((a, b) => b.newUsers - a.newUsers);
}

/* ---------- Retention ---------- */

export type Cohort = { start: Date; end: Date; size: number; weeks: (number | null)[] };

export async function getRetention(os: Os): Promise<Cohort[]> {
  const WEEKS = 6;
  const day = 86_400_000;
  const today = ptToday();
  // Last fully finished Sunday–Saturday week, Pacific time.
  let lastSat = new Date(today.getTime() - day);
  while (lastSat.getUTCDay() !== 6) lastSat = new Date(lastSat.getTime() - day);

  const cohorts = Array.from({ length: WEEKS }, (_, k) => {
    const end = new Date(lastSat.getTime() - (WEEKS - 1 - k) * 7 * day);
    return { name: `c${k}`, start: new Date(end.getTime() - 6 * day), end };
  });

  const r = await runReport({
    dimensions: names("cohort", "cohortNthWeek"),
    metrics: names("cohortActiveUsers"),
    dimensionFilter: scope(os),
    cohortSpec: {
      cohorts: cohorts.map((c) => ({
        name: c.name,
        dimension: "firstSessionDate",
        dateRange: { startDate: ymd(c.start), endDate: ymd(c.end) },
      })),
      cohortsRange: { granularity: "WEEKLY", startOffset: 0, endOffset: WEEKS - 1 },
    },
    limit: 200,
  });

  return cohorts.map((c) => {
    const val = (n: number) => r.rows.find((x) => x.d[0] === c.name && +x.d[1] === n)?.m[0] ?? 0;
    const size = val(0);
    const weeks = Array.from({ length: WEEKS }, (_, n) => {
      // Week n runs from end+1+(n-1)*7 to end+n*7 days; it's complete once that last day is before today.
      const complete = c.end.getTime() + n * 7 * day < today.getTime();
      return n === 0 || complete ? (size ? (val(n) / size) * 100 : 0) : null;
    });
    return { start: c.start, end: c.end, size, weeks };
  });
}

/* ---------- Engagement ---------- */

export async function getEngagement(p: PeriodKey, os: Os) {
  const P = PERIODS[p];
  const [active, events, ...features] = await Promise.all([
    runReport({ dateRanges: [P.cur], metrics: names("activeUsers"), dimensionFilter: scope(os) }),
    getEvents(P.cur, os),
    ...FEATURES.map((f) =>
      runReport({
        dateRanges: [P.cur],
        metrics: names("totalUsers", "eventCount"),
        dimensionFilter: scope(os, f.prefix ? beginsWith(f.prefix) : inList(f.events ?? [])),
      }),
    ),
  ]);
  return {
    activeUsers: active.rows[0]?.m[0] ?? 0,
    events,
    features: FEATURES.map((f, i) => ({
      label: f.label,
      users: features[i].rows[0]?.m[0] ?? 0,
      count: features[i].rows[0]?.m[1] ?? 0,
    })),
  };
}

/* ---------- Audience ---------- */

export async function getAudience(p: PeriodKey, os: Os) {
  const P = PERIODS[p];
  const dim = (name: string, limit: number) =>
    runReport({
      dateRanges: [P.cur],
      dimensions: names(name),
      metrics: names("activeUsers", "newUsers"),
      dimensionFilter: scope(os),
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit,
    });
  const [platform, country, version, removed] = await Promise.all([
    dim("platform", 5),
    dim("country", 12),
    dim("appVersion", 8),
    runReport({ dateRanges: [P.cur], metrics: names("totalUsers"), dimensionFilter: scope(os, inList(["app_remove"])) }),
  ]);
  const rows = (r: Report) => r.rows.map((x) => ({ name: x.d[0], active: x.m[0], new: x.m[1] }));
  return {
    platform: rows(platform),
    country: rows(country),
    version: rows(version),
    androidUninstalls: removed.rows[0]?.m[0] ?? 0,
  };
}
