"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Shows a loading dialog from the moment an internal link is clicked
// until the new page (and its Google Analytics data) has arrived.
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => setPending(false), [pathname, search]);

  // Wait briefly so cached views, which load almost instantly, don't flash the dialog.
  useEffect(() => {
    if (!pending) return setVisible(false);
    const show = setTimeout(() => setVisible(true), 150);
    // Safety net: never leave the page blocked if a navigation stalls or lands on the same URL.
    const giveUp = setTimeout(() => setPending(false), 20_000);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
    };
  }, [pending]);

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

  if (!visible) return null;
  return (
    <div className="nav-progress" role="alertdialog" aria-modal="true" aria-labelledby="nav-progress-title" aria-live="polite">
      <div className="nav-bar" />
      <div className="nav-dialog">
        <span className="spinner" aria-hidden="true" />
        <div>
          <b id="nav-progress-title">Loading the latest numbers</b>
          <span>Fetching from Google Analytics. This takes a few seconds the first time.</span>
        </div>
      </div>
    </div>
  );
}
