export const fmtN = (v: number) => Math.round(v).toLocaleString("en-US");
export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;
export const fmtDur = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
export const share = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
export const change = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : 0);
