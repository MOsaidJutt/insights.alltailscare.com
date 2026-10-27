export type PeriodKey = "daily" | "weekly" | "monthly";
export type Range = { startDate: string; endDate: string };

type Period = {
  label: string;
  span: string;
  cmp: string;
  cur: Range;
  prev: Range;
  seriesDim: "date" | "isoYearIsoWeek" | "yearMonth";
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
    seriesDim: "isoYearIsoWeek",
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

export function periodFrom(v: string | string[] | undefined): PeriodKey {
  return v === "daily" || v === "weekly" ? v : "monthly";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  return new Date(jan4.getTime() + ((week - 1) * 7 - (day - 1)) * 86_400_000);
}

export function seriesLabel(dim: Period["seriesDim"], key: string): string {
  if (dim === "date") return `${MONTHS[+key.slice(4, 6) - 1]} ${+key.slice(6)}`;
  if (dim === "yearMonth") return MONTHS[+key.slice(4, 6) - 1];
  const monday = isoWeekMonday(+key.slice(0, 4), +key.slice(4));
  return `${MONTHS[monday.getUTCMonth()]} ${monday.getUTCDate()}`;
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const shortDate = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
