"use client";

import { useState, type FormEvent } from "react";

/** Reusable daily-email capture form. Posts to /api/subscribe. */
export function EmailCapture({
  heading,
  sub,
}: {
  heading?: string;
  sub?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p
        className="text-sm text-green-700 dark:text-green-500"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        You&apos;re on the list. Tomorrow&apos;s Long View lands in your inbox.
      </p>
    );
  }

  return (
    <div>
      {heading && (
        <p
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {heading}
        </p>
      )}
      {sub && <p className="text-sm text-muted mt-1 mb-3">{sub}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 bg-accent text-white font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {status === "loading" ? "Adding…" : "Get the daily email"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-red-600 mt-2">Something went wrong. Try again.</p>
      )}
    </div>
  );
}
