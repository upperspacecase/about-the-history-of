"use client";

import { useState, type FormEvent } from "react";

/** "Flag a factual error" (§10). Posts to /api/corrections/report. */
export function ReportErrorForm({
  storyId,
  versionId,
}: {
  storyId: string;
  versionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/corrections/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, versionId, text, link }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted hover:text-accent underline cursor-pointer"
      >
        Flag a factual error
      </button>
    );
  }

  if (status === "done") {
    return (
      <p className="text-sm text-muted">
        Thanks. Your report has been recorded for review.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-left">
      <p className="text-sm font-semibold">Flag a factual error</p>
      <label className="block text-xs text-muted" htmlFor="report-text">
        What should we check?
      </label>
      <textarea
        id="report-text"
        required
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
      />
      <label className="block text-xs text-muted" htmlFor="report-link">
        Link to supporting evidence (optional)
      </label>
      <input
        id="report-link"
        type="url"
        value={link}
        maxLength={500}
        onChange={(e) => setLink(e.target.value)}
        className="w-full border border-border rounded px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
      >
        {status === "loading" ? "Sending…" : "Send for review"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-600">
          We couldn&apos;t record your report. Please try again.
        </p>
      )}
    </form>
  );
}
