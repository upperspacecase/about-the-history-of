// Canonical data contracts for the edition/story model (PRD v2 §12).
// The legacy headline-keyed cache keeps its own types in history-types.ts.

export type AccessMode = "full" | "excerpt" | "snippet";

export interface SourceReport {
  id: string;
  url: string;
  publisher: string;
  title: string;
  category: string;
  publishedAt: string; // ISO
  retrievedAt: string; // ISO
  accessMode: AccessMode;
  contentFingerprint: string;
  originGroup: string; // shared by syndicated copies of the same underlying report
  image?: string;
}

export type ClaimType =
  | "reported-fact"
  | "historical-fact"
  | "interpretation"
  | "unresolved-claim";

export interface EvidenceItem {
  id: string; // e.g. "E1" within a package; stored with a global id
  sourceReportId?: string; // set for report-backed evidence
  url: string;
  publisher: string;
  title: string;
  accessMode: AccessMode;
  passage: string; // bounded supporting passage
  kind: "report" | "web-search";
}

export type ClaimSection =
  | "whatChanged"
  | "whyItMatters"
  | "background"
  | "timeline"
  | "comparison";

export interface Claim {
  text: string;
  type: ClaimType;
  section: ClaimSection;
  evidenceIds: string[]; // must reference ids in the evidence package
  essential: boolean; // core claim → unsupported means withhold
}

export interface TimelineEntry {
  date: string; // "1971", "March 2024", ...
  text: string;
  evidenceIds: string[];
}

export interface SourceRef {
  sourceReportId?: string;
  url: string;
  publisher: string;
  title: string;
  sourceDate?: string;
  accessMode: AccessMode;
}

export interface StoryVersionDraft {
  editorialHeadline: string;
  whatChanged: string; // "What happened" on first coverage
  whyItMatters: string;
  background: string; // "How we got here"
  uncertainties: string[]; // "What remains unclear" — plain-language, specific
  whatToWatch?: string;
  timeline?: TimelineEntry[]; // optional (EVD 07)
  comparison?: {
    text: string;
    limitation: string; // "Where the comparison breaks down"
    evidenceIds: string[];
  };
  claims: Claim[];
  entities: string[];
  topics: string[];
  singleOrigin?: string; // publisher name when EVD 04 single-origin note applies
}

export interface StoryVersion extends StoryVersionDraft {
  id: string;
  storyId: string;
  predecessorId: string | null;
  updateKind: "first" | "development" | "correction";
  comparedWithVersionId?: string;
  changeReason?: string;
  sources: SourceRef[];
  publishedAt: string; // ISO
  retracted?: boolean;
  correctionIds?: string[];
  schemaVersion: 1;
}

export interface Story {
  id: string;
  slug: string;
  scope: string; // one-sentence description of the underlying situation
  entities: string[];
  topics: string[];
  searchTokens: string[];
  firstPublishedAt: string;
  latestVersionId: string;
  latestUpdateAt: string;
  relatedStoryIds: string[];
  legacyHistoryIds?: string[];
  status: "active" | "retracted";
}

export type EditionStatus =
  | "published"
  | "quiet"
  | "partial"
  | "delayed"
  | "unavailable";

export interface Edition {
  id: string; // YYYY-MM-DD (UTC edition date)
  timeZone: "UTC";
  status: EditionStatus;
  storyVersionIds: string[]; // ordered; empty for quiet/unavailable
  publishedAt: string;
  coverage: {
    feedsAttempted: number;
    feedsSucceeded: number;
    candidatesConsidered: number;
  };
  wordCount: number;
  readingMinutes: number;
}

export interface CorrectionRecord {
  id: string;
  storyId: string;
  affectedVersionIds: string[];
  replacementVersionId: string | null; // null for retraction
  reason: string;
  publicNote: string;
  severity: "material" | "retraction";
  createdAt: string;
}

export type CandidateOutcome =
  | "selected"
  | "already-covered"
  | "no-material-change"
  | "outside-scope"
  | "evidence-insufficient"
  | "processing-failed";

export interface CandidateDecision {
  clusterTitle: string;
  storyId?: string;
  outcome: CandidateOutcome;
  reason: string;
}

export interface PipelineRun {
  id: string;
  editionId: string;
  startedAt: string;
  finishedAt?: string;
  stages: Record<string, "ok" | "failed" | "skipped">;
  feedCoverage: { attempted: number; succeeded: number };
  decisions: CandidateDecision[];
  errors: string[];
  dryRun: boolean;
}

export interface DeliveryRecord {
  id: string; // idempotency key, e.g. `email:${editionId}:${subscriberId}`
  editionId: string;
  channel: "email" | "instagram";
  status: "sent" | "failed" | "pending";
  attempts: number;
  providerReceipt?: string;
  updatedAt: string;
}

// Public API payload for one story card / page (never includes raw evidence
// passages or internal notes — PRD §12 privacy line).
export interface PublicStoryVersion {
  id: string;
  storyId: string;
  slug: string;
  predecessorId: string | null;
  updateKind: "first" | "development" | "correction";
  editorialHeadline: string;
  whatChanged: string;
  whyItMatters: string;
  background: string;
  uncertainties: string[];
  whatToWatch?: string;
  timeline?: { date: string; text: string; sources: PublicSource[] }[];
  comparison?: { text: string; limitation: string };
  sources: PublicSource[];
  singleOrigin?: string;
  publishedAt: string;
  firstPublishedAt: string;
  latestVersionId: string;
  retracted?: boolean;
  corrections: { date: string; publicNote: string; severity: string }[];
}

export interface PublicSource {
  url: string;
  publisher: string;
  title: string;
  sourceDate?: string;
  accessMode: AccessMode; // rendered truthfully: "Article excerpt" vs full (STY 05)
}
