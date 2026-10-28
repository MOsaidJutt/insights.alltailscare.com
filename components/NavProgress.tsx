"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Shows a loading dialog from the moment an internal link is clicked
// until the new page (and its Google Analytics data) has arrived.
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);

  useEffect(() => setPending(false), [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      setPending(true);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!pending) return null;
  return (
    <div className="nav-progress" role="status" aria-live="polite">
      <div className="nav-bar" />
      <div className="nav-dialog">
        <span className="spinner" aria-hidden="true" />
        <div>
          <b>Loading the latest numbers</b>
          <span>Fetching from Google Analytics. First load of a view takes a few seconds, then it’s cached for an hour.</span>
        </div>
      </div>
    </div>
  );
}
