import type { HistoryResponse } from "@/lib/history-types";
import { SCORE_DIMENSIONS } from "@/lib/significance";

/**
 * The expandable sections of a story card: precedent, crucial difference,
 * score breakdown, sources, what to watch, and the revision log. Renders
 * nothing for stories generated before these fields existed.
 */
export function VerdictDetails({ story }: { story: HistoryResponse }) {
  const hasAnything =
    story.precedent ||
    story.scoreBreakdown ||
    (story.sources && story.sources.length > 0) ||
    story.whatWouldChange ||
    (story.revisions && story.revisions.length > 0);
  if (!hasAnything) return null;

  const summaryClass =
    "cursor-pointer text-xs font-medium uppercase tracking-widest text-muted hover:text-accent transition-colors select-none";

  return (
    <div className="mt-5 border border-border rounded-lg divide-y divide-border bg-card">
      {story.precedent && (
        <details className="p-4">
          <summary className={summaryClass}>Closest precedent</summary>
          <div className="mt-3 text-sm leading-relaxed">
            <p
              className="font-semibold"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {story.precedent.name}
            </p>
            <p className="text-muted mt-1">{story.precedent.similarity}</p>
            <p className="mt-3">
              <span className="text-xs font-medium uppercase tracking-wider text-accent">
                The crucial difference:
              </span>{" "}
              <span className="text-muted">
                {story.precedent.crucialDifference}
              </span>
            </p>
          </div>
        </details>
      )}

      {story.scoreBreakdown && (
        <details className="p-4">
          <summary className={summaryClass}>Score breakdown</summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {SCORE_DIMENSIONS.map((d) => (
              <li
                key={d.key}
                className="flex items-baseline justify-between gap-4"
              >
                <span title={d.question}>{d.label}</span>
                <span className="font-mono text-muted">
                  {story.scoreBreakdown![d.key]}/2
                </span>
              </li>
            ))}
            {typeof story.significance === "number" && (
              <li className="flex items-baseline justify-between gap-4 border-t border-border pt-1.5 font-semibold">
                <span>Provisional total</span>
                <span className="font-mono">{story.significance}/10</span>
              </li>
            )}
          </ul>
        </details>
      )}

      {story.whatWouldChange && (
        <details className="p-4">
          <summary className={summaryClass}>What would change the score</summary>
          <div className="mt-3 text-sm text-muted leading-relaxed space-y-2">
            <p>
              <span className="text-foreground font-medium">Raise it:</span>{" "}
              {story.whatWouldChange.raise}
            </p>
            <p>
              <span className="text-foreground font-medium">Lower it:</span>{" "}
              {story.whatWouldChange.lower}
            </p>
          </div>
        </details>
      )}

      {story.sources && story.sources.length > 0 && (
        <details className="p-4">
          <summary className={summaryClass}>
            Sources ({story.sources.length})
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {story.sources.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent transition-colors"
                  >
                    <span className="text-muted">[{s.publisher}]</span>{" "}
                    {s.title}
                  </a>
                ) : (
                  <span>
                    <span className="text-muted">[{s.publisher}]</span>{" "}
                    {s.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {story.confidenceReasons && story.confidenceReasons.length > 0 && (
        <details className="p-4">
          <summary className={summaryClass}>How confidence was calculated</summary>
          <ul className="mt-3 space-y-1 text-sm text-muted list-disc pl-4">
            {story.confidenceReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </details>
      )}

      {story.revisions && story.revisions.length > 0 && (
        <details className="p-4">
          <summary className={summaryClass}>
            Corrections and revisions ({story.revisions.length})
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {story.revisions.map((r, i) => (
              <li key={i}>
                <span className="font-mono text-xs">
                  {r.at.slice(0, 10)}
                </span>{" "}
                {r.note}
                {typeof r.previousScore === "number" &&
                  typeof r.newScore === "number" &&
                  r.previousScore !== r.newScore && (
                    <span>
                      {" "}
                      Score changed from {r.previousScore}/10 to {r.newScore}
                      /10.
                    </span>
                  )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
