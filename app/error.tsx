"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap">
      <section className="card">
        <h1>We couldn’t load this report</h1>
        <p className="muted">{error.message || "Google Analytics didn’t respond."} Try again in a minute.</p>
        <button className="seg" onClick={reset} style={{ border: 0, padding: "8px 14px", cursor: "pointer" }}>
          Try again
        </button>
      </section>
    </main>
  );
}
