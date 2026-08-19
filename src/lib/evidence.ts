import type { Headline } from "./feeds";
import type { SupportingSource } from "./history-types";

/**
 * Evidence packages ground every story. A story is only as good as the
 * reporting behind it, so candidates that rest on a single weak source are
 * rejected before any analysis is attempted.
 */

export interface EvidencePassage {
  publisher: string;
  headline: string;
  text: string;
  url: string;
}

export interface EvidencePackage {
  /** The representative source headline for the event. */
  sourceHeadline: string;
  sourcePublisher: string;
  sourceUrl: string;
  category: string;
  sources: SupportingSource[];
  /** Source passages that factual claims must be attached to. */
  passages: EvidencePassage[];
  independentPublisherCount: number;
  /** Number of reports in the cluster. Not a significance signal. */
  coverageVolume: number;
  /** Most recent report is only hours old; the event may still be moving. */
  rapidlyDeveloping: boolean;
}

export type EvidenceResult =
  | { ok: true; evidence: EvidencePackage }
  | { ok: false; rejected: string };

/** Publishers strong enough to carry a single-source story on their own. */
const TIER_ONE_PUBLISHERS = new Set([
  "BBC News",
  "New York Times",
  "Washington Post",
  "Wall Street Journal",
  "NPR",
]);

const RAPID_WINDOW_MS = 6 * 60 * 60 * 1000;

export function buildEvidencePackage(
  members: Headline[],
  representative?: Headline
): EvidenceResult {
  const usable = members.filter((m) => m.title && m.link);
  if (usable.length === 0) {
    return { ok: false, rejected: "no usable reports in the cluster" };
  }

  const face = representative ?? usable[0];
  const publishers = new Set(usable.map((m) => m.source));

  if (publishers.size < 2) {
    const only = usable[0];
    const weak =
      !TIER_ONE_PUBLISHERS.has(only.source) || !only.snippet?.trim();
    if (weak) {
      return {
        ok: false,
        rejected: `relies on a single weak source (${only.source})`,
      };
    }
  }

  const sources: SupportingSource[] = usable.map((m) => ({
    publisher: m.source,
    title: m.title,
    url: m.link,
    publishedAt: m.pubDate || undefined,
  }));

  const passages: EvidencePassage[] = usable
    .filter((m) => m.snippet?.trim())
    .map((m) => ({
      publisher: m.source,
      headline: m.title,
      text: m.snippet.trim(),
      url: m.link,
    }));

  const newest = Math.max(
    ...usable.map((m) => new Date(m.pubDate).getTime() || 0)
  );
  const rapidlyDeveloping =
    newest > 0 && Date.now() - newest < RAPID_WINDOW_MS;

  return {
    ok: true,
    evidence: {
      sourceHeadline: face.title,
      sourcePublisher: face.source,
      sourceUrl: face.link,
      category: face.category,
      sources,
      passages,
      independentPublisherCount: publishers.size,
      coverageVolume: usable.length,
      rapidlyDeveloping,
    },
  };
}

/** Render the package as prompt-ready text with claims tied to publishers. */
export function evidenceToPrompt(evidence: EvidencePackage): string {
  const lines: string[] = [
    `Event (representative headline): ${evidence.sourceHeadline}`,
    `Reported by ${evidence.independentPublisherCount} independent publisher(s); ${evidence.coverageVolume} report(s) in total.`,
    `Category: ${evidence.category}`,
    evidence.rapidlyDeveloping
      ? "Status: still rapidly developing (most recent report is hours old)."
      : "Status: reporting has had time to settle.",
    "",
    "Source reports:",
  ];
  for (const s of evidence.sources) {
    lines.push(`- [${s.publisher}] ${s.title} (${s.url})`);
  }
  if (evidence.passages.length > 0) {
    lines.push("", "Source passages (claims must be supported by these):");
    for (const p of evidence.passages) {
      lines.push(`- [${p.publisher}] ${p.text}`);
    }
  }
  return lines.join("\n");
}
