import Link from "next/link";
import { PERIODS, type Os, type PeriodKey } from "@/lib/periods";
import { CsvButton, PageTools } from "./Tools";
import { ROLE_LABEL, canManage, requireUser } from "@/lib/users";

const TABS = [
  ["/", "Overview"],
  ["/funnel", "Funnel"],
  ["/acquisition", "Acquisition"],
  ["/retention", "Retention"],
  ["/engagement", "Engagement"],
  ["/audience", "Audience"],
  ["/links", "Tracked links"],
  ["/notes", "Notes"],
] as const;

const PLATFORMS: [Os, string][] = [
  ["all", "All"],
  ["ios", "iPhone"],
  ["android", "Android"],
];

function href(path: string, period: PeriodKey, os: Os) {
  const q = new URLSearchParams();
  if (period !== "monthly") q.set("p", period);
  if (os !== "all") q.set("os", os);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export async function Shell({
  active,
  period,
  os = "all",
  showPeriod = true,
  showPlatform = true,
  children,
}: {
  active: string;
  period: PeriodKey;
  os?: Os;
  showPeriod?: boolean;
  showPlatform?: boolean;
  children: React.ReactNode;
}) {
  const me = await requireUser();
  const tabs: readonly (readonly [string, string])[] = canManage(me) ? [...TABS, ["/reports", "Reports"], ["/team", "Team"]] : TABS;
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
              <span>Google Analytics · Pacific time · refreshes every hour</span>
            </div>
          </div>
          <div className="controls">
            {showPlatform && (
              <nav className="seg" aria-label="Platform">
                {PLATFORMS.map(([k, label]) => (
                  <Link key={k} href={href(active, period, k)} aria-current={k === os ? "true" : undefined}>
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {showPeriod && (
              <nav className="seg" aria-label="Report period">
                {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
                  <Link key={k} href={href(active, k, os)} aria-current={k === period ? "true" : undefined}>
                    {PERIODS[k].label}
                  </Link>
                ))}
              </nav>
            )}
            <PageTools />
            <details className="user-menu">
              <summary aria-label="Account">
                {me.picture ? (
                  <img src={me.picture} alt="" width={30} height={30} referrerPolicy="no-referrer" />
                ) : (
                  <span className="avatar">{(me.name ?? me.email)[0].toUpperCase()}</span>
                )}
              </summary>
              <div className="user-pop">
                <b>{me.name ?? me.email}</b>
                <span className="muted">{me.email}</span>
                <span className="pill p-good">{ROLE_LABEL[me.role]}</span>
                {canManage(me) && <Link href="/team">Manage team</Link>}
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="mini-btn">Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </div>
        <div className="wrap tabs-scroll">
          <nav className="tabs" aria-label="Sections">
            {tabs.map(([path, label]) => (
              <Link key={path} href={href(path, period, os)} aria-current={path === active ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="wrap">{children}</main>
      <footer className="wrap">
        Data: Google Analytics 4 (Firebase), property 458080625. Periods end yesterday, Pacific time. Weeks start on Sunday.
      </footer>
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

export function Card({
  title,
  src,
  csv = false,
  children,
}: {
  title: string;
  src?: string;
  csv?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-h">
        <h2>{title}</h2>
        <div className="card-tools">
          {src && <span className="src">{src}</span>}
          {csv && <CsvButton name={title} />}
        </div>
      </div>
      {children}
    </section>
  );
}

export const osLabel = (os: Os) => (os === "ios" ? " · iPhone only" : os === "android" ? " · Android only" : "");
