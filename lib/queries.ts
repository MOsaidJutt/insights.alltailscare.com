import { runReport, type Report } from "./ga";
import { PERIODS, ymd, type PeriodKey, type Range } from "./periods";
import { FEATURES, ONBOARDING_FUNNEL, PAYWALL_PLACEMENTS, SIGNUP_COMPLETED, SIGNUP_METHODS } from "./events";

const names = (...n: string[]) => n.map((name) => ({ name }));
const inList = (values: string[]) => ({ filter: { fieldName: "eventName", inListFilter: { values } } });
const beginsWith = (value: string) => ({
  filter: { fieldName: "eventName", stringFilter: { matchType: "BEGINS_WITH", value } },
});

/* ---------- Growth ---------- */

// GA returns inflated user counts when several date ranges share one request,
// so each period gets its own query. Stickiness = average daily users ÷ users in the 30 days to the period end.
async function periodKpis(range: Range, monthEnding: Range) {
  const [totals, daily, month] = await Promise.all([
    runReport({ dateRanges: [range], metrics: names("activeUsers", "newUsers", "sessions", "userEngagementDuration") }),
    runReport({ dateRanges: [range], dimensions: names("date"), metrics: names("activeUsers"), limit: 100 }),
    runReport({ dateRanges: [monthEnding], metrics: names("activeUsers") }),
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

export async function getGrowth(p: PeriodKey) {
  const P = PERIODS[p];
  const [cur, prev, series, platform] = await Promise.all([
    periodKpis(P.cur, { startDate: "30daysAgo", endDate: P.cur.endDate }),
    periodKpis(P.prev, { startDate: `${Number(P.prev.endDate.replace(/\D/g, "")) + 29}daysAgo`, endDate: P.prev.endDate }),
    runReport({
      dateRanges: [{ startDate: P.seriesStart, endDate: "yesterday" }],
      dimensions: names(P.seriesDim),
      metrics: names("activeUsers", "newUsers", "sessions"),
      orderBys: [{ dimension: { dimensionName: P.seriesDim } }],
      limit: 400,
    }),
    runReport({ dateRanges: [P.cur], dimensions: names("platform"), metrics: names("activeUsers") }),
  ]);
  return {
    cur,
    prev,
    series: series.rows.map((r) => ({ key: r.d[0], active: r.m[0], new: r.m[1], sessions: r.m[2] })),
    platform: platform.rows.map((r) => ({ name: r.d[0], users: r.m[0] })),
  };
}

/* ---------- Funnel ---------- */

export type FunnelStep = { label: string; events: string[]; total: number; ios: number; android: number };

export async function getFunnel(p: PeriodKey): Promise<FunnelStep[]> {
  const P = PERIODS[p];
  const reports = await Promise.all(
    ONBOARDING_FUNNEL.map((s) =>
      runReport({
        dateRanges: [P.cur],
        dimensions: names("platform"),
        metrics: names("totalUsers"),
        dimensionFilter: inList(s.events),
        metricAggregations: ["TOTAL"],
      }),
    ),
  );
  return ONBOARDING_FUNNEL.map((s, i) => {
    const r = reports[i];
    const on = (platform: string) => r.rows.find((x) => x.d[0] === platform)?.m[0] ?? 0;
    return {
      label: s.label,
      events: s.events,
      total: r.totals?.[0] ?? r.rows.reduce((a, x) => a + x.m[0], 0),
      ios: on("iOS"),
      android: on("Android"),
    };
  });
}

export type EventStat = { name: string; count: number; users: number };

export async function getEvents(range: Range): Promise<EventStat[]> {
  const r = await runReport({
    dateRanges: [range],
    dimensions: names("eventName"),
    metrics: names("eventCount", "totalUsers"),
    limit: 1000,
  });
  return r.rows.map((x) => ({ name: x.d[0], count: x.m[0], users: x.m[1] }));
}

export async function getConversion(p: PeriodKey) {
  const events = await getEvents(PERIODS[p].cur);
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

export async function getAcquisition(p: PeriodKey) {
  const P = PERIODS[p];
  const [sources, quality] = await Promise.all([
    runReport({
      dateRanges: [P.cur],
      dimensions: names("firstUserSource", "firstUserMedium"),
      metrics: names("newUsers", "activeUsers"),
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 25,
    }),
    runReport({
      dateRanges: [P.cur],
      dimensions: names("firstUserSource", "eventName"),
      metrics: names("totalUsers"),
      dimensionFilter: inList(["first_open", "paywall_viewed_onboarding", ...SIGNUP_COMPLETED]),
      limit: 1000,
    }),
  ]);
  const q = (source: string, test: (e: string) => boolean) =>
    quality.rows.filter((r) => r.d[0] === source && test(r.d[1])).reduce((a, r) => a + r.m[0], 0);
  return sources.rows.map((r) => ({
    source: r.d[0],
    medium: r.d[1],
    newUsers: r.m[0],
    active: r.m[1],
    opened: q(r.d[0], (e) => e === "first_open"),
    paywall: q(r.d[0], (e) => e === "paywall_viewed_onboarding"),
    signups: q(r.d[0], (e) => SIGNUP_COMPLETED.includes(e)),
  }));
}

/* ---------- Retention ---------- */

export type Cohort = { start: Date; end: Date; size: number; weeks: (number | null)[] };

export async function getRetention(): Promise<Cohort[]> {
  const WEEKS = 6;
  const day = 86_400_000;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Last fully finished Sunday–Saturday week.
  let lastSat = new Date(today.getTime() - day);
  while (lastSat.getUTCDay() !== 6) lastSat = new Date(lastSat.getTime() - day);

  const cohorts = Array.from({ length: WEEKS }, (_, k) => {
    const end = new Date(lastSat.getTime() - (WEEKS - 1 - k) * 7 * day);
    return { name: `c${k}`, start: new Date(end.getTime() - 6 * day), end };
  });

  const r = await runReport({
    dimensions: names("cohort", "cohortNthWeek"),
    metrics: names("cohortActiveUsers"),
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
    const val = (n: number) =>
      r.rows.find((x) => x.d[0] === c.name && +x.d[1] === n)?.m[0] ?? 0;
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

export async function getEngagement(p: PeriodKey) {
  const P = PERIODS[p];
  const [active, events, ...features] = await Promise.all([
    runReport({ dateRanges: [P.cur], metrics: names("activeUsers") }),
    getEvents(P.cur),
    ...FEATURES.map((f) =>
      runReport({
        dateRanges: [P.cur],
        metrics: names("totalUsers", "eventCount"),
        dimensionFilter: f.prefix ? beginsWith(f.prefix) : inList(f.events ?? []),
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

export async function getAudience(p: PeriodKey) {
  const P = PERIODS[p];
  const dim = (name: string, limit: number) =>
    runReport({
      dateRanges: [P.cur],
      dimensions: names(name),
      metrics: names("activeUsers", "newUsers"),
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit,
    });
  const [platform, country, version, device, removed] = await Promise.all([
    dim("platform", 5),
    dim("country", 12),
    dim("appVersion", 8),
    dim("deviceCategory", 5),
    runReport({ dateRanges: [P.cur], metrics: names("totalUsers"), dimensionFilter: inList(["app_remove"]) }),
  ]);
  const rows = (r: Report) => r.rows.map((x) => ({ name: x.d[0], active: x.m[0], new: x.m[1] }));
  return {
    platform: rows(platform),
    country: rows(country),
    version: rows(version),
    device: rows(device),
    androidUninstalls: removed.rows[0]?.m[0] ?? 0,
  };
}
