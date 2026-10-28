"use client";

import { useState, type MouseEvent } from "react";

export function PageTools() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  }
  return (
    <div className="tools">
      <button type="button" onClick={copy} title="Copy a link to this exact view">
        {copied ? "Link copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => window.print()} title="Save this page as a PDF">
        Save PDF
      </button>
    </div>
  );
}

const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function CsvButton({ name }: { name: string }) {
  function download(e: MouseEvent<HTMLButtonElement>) {
    const table = e.currentTarget.closest(".card")?.querySelector("table");
    if (!table) return;
    const csv = Array.from(table.rows)
      .map((r) => Array.from(r.cells, (c) => cell((c.innerText || "").replace(/\s+/g, " ").trim())).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `alltails-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" className="mini-btn" onClick={download}>
      CSV
    </button>
  );
}
