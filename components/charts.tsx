import { fmtPct } from "@/lib/format";

type Series = { name: string; values: number[]; color: string };

function niceMax(m: number) {
  if (m <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  const k = m / p;
  return (k <= 1.5 ? 1.5 : k <= 2 ? 2 : k <= 3 ? 3 : k <= 5 ? 5 : 10) * p;
}

export function LineChart({
  series,
  labels,
  format,
  min = 0,
  area = true,
  marks = [],
}: {
  series: Series[];
  labels: string[];
  format: (v: number) => string;
  min?: number;
  area?: boolean;
  marks?: { i: number; text: string }[];
}) {
  const n = labels.length;
  if (n < 2) return <p className="empty">Not enough data for a trend yet.</p>;
  const W = 640, H = 230, pl = 48, pr = 14, pt = marks.length ? 22 : 12, pb = 28;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)) * 1.05);
  const X = (i: number) => pl + (i * (W - pl - pr)) / (n - 1);
  const Y = (v: number) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const step = Math.ceil(n / 7);
  return (
    <>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span key={s.name} style={{ "--k": `var(${s.color})` } as React.CSSProperties}>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(", ")}>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = min + ((max - min) * k) / 4;
          return (
            <g key={k}>
              <line x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} className="grid" />
              <text x={pl - 8} y={Y(v) + 4} textAnchor="end" className="axis">
                {format(v)}
              </text>
            </g>
          );
        })}
        {labels.map((t, i) =>
          (n - 1 - i) % step === 0 ? (
            <text key={i} x={X(i)} y={H - 8} textAnchor="middle" className="axis">
              {t}
            </text>
          ) : null,
        )}
        {marks.map((m, k) => (
          <g key={`m${k}`} className="mark">
            <line x1={X(m.i)} x2={X(m.i)} y1={pt - 8} y2={H - pb} />
            <circle cx={X(m.i)} cy={pt - 10} r={5}>
              <title>{m.text}</title>
            </circle>
          </g>
        ))}
        {series.map((s, si) => {
          const d = s.values.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
          const last = s.values[n - 1];
          return (
            <g key={s.name}>
              {si === 0 && area && (
                <path d={`${d}L${X(n - 1)} ${Y(min)}L${X(0)} ${Y(min)}Z`} style={{ fill: `var(${s.color})`, opacity: 0.12 }} />
              )}
              <path d={d} style={{ fill: "none", stroke: `var(${s.color})`, strokeWidth: 2.2, strokeLinejoin: "round" }} />
              <circle cx={X(n - 1)} cy={Y(last)} r={4} style={{ fill: "var(--surface)", stroke: `var(${s.color})`, strokeWidth: 2.2 }}>
                <title>{`${s.name}: ${format(last)}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </>
  );
}

export function Delta({ value, good = 1, unit = "%" }: { value: number; good?: 1 | -1 | 0; unit?: string }) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return <span className="d flat">no change</span>;
  const cls = good === 0 ? "flat" : value > 0 === good > 0 ? "up" : "down";
  return (
    <span className={`d ${cls}`}>
      {value > 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}
      {unit}
    </span>
  );
}

export function Kpi({
  label,
  value,
  note,
  delta,
}: {
  label: string;
  value: string;
  note: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      <div className="row">{delta}</div>
      <span className="src">{note}</span>
    </div>
  );
}

export function Bar({ pct }: { pct: number }) {
  return (
    <div className="bar">
      <i style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </div>
  );
}

const STACK_COLORS = ["--accent", "--c3", "--c2", "--accent-2", "--c4", "--bad"];

export function Stack({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <>
      <div className="stack">
        {parts.map((p, i) => (
          <i key={p.label} style={{ flex: p.value, background: `var(${STACK_COLORS[i % STACK_COLORS.length]})` }} title={p.label}>
            {p.value / total >= 0.08 ? fmtPct((p.value / total) * 100, 0) : ""}
          </i>
        ))}
      </div>
      <div className="legend">
        {parts.map((p, i) => (
          <span key={p.label} style={{ "--k": `var(${STACK_COLORS[i % STACK_COLORS.length]})` } as React.CSSProperties}>
            {p.label} · {fmtPct((p.value / total) * 100, 0)}
          </span>
        ))}
      </div>
    </>
  );
}
