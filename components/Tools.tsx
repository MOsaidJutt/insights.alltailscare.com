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
  async function emailLink() {
    const to = window.prompt("Email a link to this view to:");
    if (!to) return;
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, url: window.location.href }),
    });
    const body = await res.json().catch(() => ({}));
    window.alert(res.ok ? `Sent to ${to}.` : body.error ?? "The email didn’t send. Try again.");
  }
  return (
    <div className="tools">
      <button type="button" onClick={copy} title="Copy a link to this exact view">
        {copied ? "Link copied" : "Copy link"}
      </button>
      <button type="button" onClick={emailLink} title="Email a link to this view to a teammate">
        Email link
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

export function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="mini-btn danger"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function CopyField({ value, compact = false }: { value: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", value);
    }
  }
  if (compact)
    return (
      <button type="button" className="mini-btn" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    );
  return (
    <div className="copy-field">
      <code>{value}</code>
      <button type="button" className="mini-btn" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
