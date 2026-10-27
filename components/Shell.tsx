import Link from "next/link";
import { PERIODS, type PeriodKey } from "@/lib/periods";

const TABS = [
  ["/", "User growth"],
  ["/funnel", "Funnel"],
  ["/acquisition", "Where users come from"],
  ["/retention", "Retention"],
  ["/engagement", "Engagement"],
  ["/audience", "Audience"],
] as const;

export function Shell({
  active,
  period,
  showPeriod = true,
  children,
}: {
  active: string;
  period: PeriodKey;
  showPeriod?: boolean;
  children: React.ReactNode;
}) {
  const q = period === "monthly" ? "" : `?p=${period}`;
  return (
    <>
      <header className="top">
        <div className="wrap top-in">
          <div className="brand">
            <div className="paw" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="#fff">
                <ellipse cx="6" cy="9" rx="2.2" ry="2.8" />
                <ellipse cx="10" cy="5.5" rx="2.2" ry="2.8" />
                <ellipse cx="14.5" cy="5.5" rx="2.2" ry="2.8" />
                <ellipse cx="18.5" cy="9" rx="2.2" ry="2.8" />
                <path d="M12.2 11c-3.4 0-6.2 3.6-6.2 6.3 0 1.9 1.6 2.7 3.2 2.7 1.3 0 2-.6 3-.6s1.7.6 3 .6c1.6 0 3.2-.8 3.2-2.7 0-2.7-2.8-6.3-6.2-6.3z" />
              </svg>
            </div>
            <div>
              <b>AllTails Care Insights</b>
              <span>Google Analytics · refreshes every hour</span>
            </div>
          </div>
          {showPeriod && (
            <nav className="seg" aria-label="Report period">
              {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
                <Link
                  key={k}
                  href={`${active}${k === "monthly" ? "" : `?p=${k}`}`}
                  aria-current={k === period ? "true" : undefined}
                >
                  {PERIODS[k].label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="wrap tabs-scroll">
          <nav className="tabs" aria-label="Sections">
            {TABS.map(([href, label]) => (
              <Link key={href} href={`${href}${q}`} aria-current={href === active ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap">Data: Google Analytics 4 (Firebase), property 458080625. Periods end yesterday.</footer>
    </>
  );
}

export function Head({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ title, src, children }: { title: string; src?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="card-h">
        <h2>{title}</h2>
        {src && <span className="src">{src}</span>}
      </div>
      {children}
    </section>
  );
}
