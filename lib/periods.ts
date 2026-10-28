export type PeriodKey = "daily" | "weekly" | "monthly";
export type Range = { startDate: string; endDate: string };

type Period = {
  label: string;
  span: string;
  cmp: string;
  cur: Range;
  prev: Range;
  seriesDim: "date" | "yearWeek" | "yearMonth";
  seriesStart: string;
};

// Every period ends yesterday so a half-finished day never skews the numbers.
export const PERIODS: Record<PeriodKey, Period> = {
  daily: {
    label: "Daily",
    span: "Yesterday",
    cmp: "vs the day before",
    cur: { startDate: "yesterday", endDate: "yesterday" },
    prev: { startDate: "2daysAgo", endDate: "2daysAgo" },
    seriesDim: "date",
    seriesStart: "14daysAgo",
  },
  weekly: {
    label: "Weekly",
    span: "Last 7 days",
    cmp: "vs the 7 days before",
    cur: { startDate: "7daysAgo", endDate: "yesterday" },
    prev: { startDate: "14daysAgo", endDate: "8daysAgo" },
    seriesDim: "yearWeek",
    seriesStart: "83daysAgo",
  },
  monthly: {
    label: "Monthly",
    span: "Last 30 days",
    cmp: "vs the 30 days before",
    cur: { startDate: "30daysAgo", endDate: "yesterday" },
    prev: { startDate: "60daysAgo", endDate: "31daysAgo" },
    seriesDim: "yearMonth",
    seriesStart: "365daysAgo",
  },
};

export type Os = "all" | "ios" | "android";
export type SearchParams = Promise<{ p?: string; os?: string }>;

export function periodFrom(v: string | string[] | undefined): PeriodKey {
  return v === "daily" || v === "weekly" ? v : "monthly";
}

export function osFrom(v: string | string[] | undefined): Os {
  return v === "ios" || v === "android" ? v : "all";
}

export async function readParams(sp: SearchParams) {
  const q = await sp;
  return { period: periodFrom(q.p), os: osFrom(q.os) };
}

export const TIME_ZONE = "America/Los_Angeles";
const DAY = 86_400_000;

// Today's date in Pacific time, as a UTC-midnight Date (matches GA's property time zone).
export function ptToday(): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

// Turns GA's relative dates ("yesterday", "30daysAgo") into YYYYMMDD in Pacific time.
export function concreteDate(rel: string): string {
  const n = rel === "today" ? 0 : rel === "yesterday" ? 1 : Number(rel.replace(/\D/g, ""));
  return ymd(new Date(ptToday().getTime() - n * DAY)).replace(/-/g, "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// GA's yearWeek: weeks start on Sunday and Jan 1 is always in week 01.
function weekSunday(year: number, week: number): Date {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const start = jan1.getTime() + ((week - 1) * 7 - jan1.getUTCDay()) * DAY;
  return new Date(Math.max(start, jan1.getTime()));
}

export function seriesLabel(dim: Period["seriesDim"], key: string): string {
  if (dim === "date") return `${MONTHS[+key.slice(4, 6) - 1]} ${+key.slice(6)}`;
  if (dim === "yearMonth") return MONTHS[+key.slice(4, 6) - 1];
  const sunday = weekSunday(+key.slice(0, 4), +key.slice(4));
  return `${MONTHS[sunday.getUTCMonth()]} ${sunday.getUTCDate()}`;
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const shortDate = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
