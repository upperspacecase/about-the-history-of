// Evidence retrieval (PRD §7). Fetches the reporting behind a cluster of
// feed items before any analysis is written. No paywall bypass: a fetch that
// fails, redirects to a login wall, or yields too little text falls back to
// the RSS snippet with accessMode "snippet" (EVD 02).

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Headline } from "./feeds";
import type { AccessMode, EvidenceItem, SourceReport } from "./story-types";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const MAX_PASSAGE_CHARS = 4_000;
const FULL_TEXT_MIN_CHARS = 800;

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const low = ip.toLowerCase();
    return (
      low === "::1" ||
      low.startsWith("fe80") ||
      low.startsWith("fc") ||
      low.startsWith("fd") ||
      low.startsWith("::ffff:127.") ||
      low.startsWith("::ffff:10.") ||
      low.startsWith("::ffff:192.168.")
    );
  }
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

// Server-side URL fetching must validate destinations and block
// private-network access (PRD §7 retrieval safeguards).
async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`blocked protocol: ${url.protocol}`);
  }
  const host = url.hostname;
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`blocked private address: ${host}`);
    return;
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`blocked host: ${host}`);
  }
  const records = await lookup(host, { all: true });
  for (const rec of records) {
    if (isPrivateIp(rec.address)) {
      throw new Error(`blocked host resolving to private address: ${host}`);
    }
  }
}

async function boundedFetch(rawUrl: string): Promise<{ status: number; body: string; finalUrl: string }> {
  let current = rawUrl;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const url = new URL(current);
    await assertPublicHost(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "TheLongViewBot/1.0 (+https://thelongview.org/how-it-works)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return { status: res.status, body: "", finalUrl: current };
        current = new URL(loc, url).toString();
        continue;
      }
      const reader = res.body?.getReader();
      if (!reader) return { status: res.status, body: "", finalUrl: current };
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        chunks.push(value);
        if (received >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
      const body = Buffer.concat(chunks).toString("utf8");
      return { status: res.status, body, finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("too many redirects");
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&lsquo;|&#8216;/g, "'")
    .replace(/&ldquo;|&#8220;|&rdquo;|&#8221;/g, '"')
    .replace(/&mdash;|&#8212;/g, "—")
    .replace(/&ndash;|&#8211;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

// Naive readability: strip non-content elements, then keep paragraph text.
export function extractArticleText(html: string): string {
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const paragraphs: string[] = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutBlocks)) !== null) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length >= 40) paragraphs.push(text);
  }
  return paragraphs.join("\n\n");
}

export function contentFingerprint(text: string): string {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 1200);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 24);
}

export function sourceReportId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

export interface RetrievedReport {
  report: SourceReport;
  text: string; // article text, excerpt, or snippet — per accessMode
}

export async function retrieveReport(item: Headline): Promise<RetrievedReport> {
  const retrievedAt = new Date().toISOString();
  let accessMode: AccessMode = "snippet";
  let text = item.snippet || "";

  if (item.link) {
    try {
      const { status, body } = await boundedFetch(item.link);
      if (status === 200 && body) {
        const article = extractArticleText(body);
        if (article.length >= FULL_TEXT_MIN_CHARS) {
          accessMode = "full";
          text = article;
        } else if (article.length >= 200) {
          accessMode = "excerpt";
          text = article;
        }
      }
    } catch {
      // inaccessible source — keep the snippet, never bypass (EVD 02)
    }
  }

  const report: SourceReport = {
    id: sourceReportId(item.link || item.title),
    url: item.link,
    publisher: item.source,
    title: item.title,
    category: item.category,
    publishedAt: item.pubDate,
    retrievedAt,
    accessMode,
    contentFingerprint: contentFingerprint(text || item.title),
    originGroup: "", // assigned across the cluster below
    image: item.image,
  };
  return { report, text };
}

export interface EvidencePackage {
  reports: RetrievedReport[];
  items: EvidenceItem[]; // report passages, ids E1..En
  independentOrigins: number;
}

// Distinct websites are not automatically independent (EVD 03): identical
// content fingerprints (wire copy) share one origin group.
function assignOriginGroups(reports: RetrievedReport[]): void {
  const byFingerprint = new Map<string, string>();
  for (const { report } of reports) {
    const existing = byFingerprint.get(report.contentFingerprint);
    if (existing) {
      report.originGroup = existing;
    } else {
      report.originGroup = report.contentFingerprint;
      byFingerprint.set(report.contentFingerprint, report.contentFingerprint);
    }
  }
}

export async function buildEvidencePackage(
  cluster: Headline[]
): Promise<EvidencePackage> {
  const retrieved: RetrievedReport[] = [];
  for (const item of cluster) {
    retrieved.push(await retrieveReport(item));
  }
  assignOriginGroups(retrieved);

  const items: EvidenceItem[] = retrieved
    .filter((r) => r.text.trim().length > 0)
    .map((r, i) => ({
      id: `E${i + 1}`,
      sourceReportId: r.report.id,
      url: r.report.url,
      publisher: r.report.publisher,
      title: r.report.title,
      accessMode: r.report.accessMode,
      passage: r.text.slice(0, MAX_PASSAGE_CHARS),
      kind: "report" as const,
    }));

  const origins = new Set(
    retrieved
      .filter((r) => r.report.accessMode !== "snippet" || r.text.length > 0)
      .map((r) => r.report.originGroup)
  );

  return { reports: retrieved, items, independentOrigins: origins.size };
}
