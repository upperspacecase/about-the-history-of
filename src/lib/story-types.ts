// Canonical data contracts for the story/edition model (PRD v2 §12).
// The legacy headline-keyed `histories` collection keeps its own shape in
// history-types.ts; a published legacy history can be mapped to a story via
// histories/{id}.storyId.

import type { StoryDoc } from "./story-generate";
import type { ResearchSource } from "./research";

export type UpdateKind = "first" | "development" | "correction";

export interface Story {
  id: string;
  slug: string;
  /** One-sentence description of the underlying situation. */
  scope: string;
  entities: string[];
  topics: string[];
  /** Lowercased tokens for archive search (array-contains queries). */
  searchTokens: string[];
  firstPublishedAt: string; // ISO
  latestVersionId: string;
  latestUpdateAt: string; // ISO
  versionCount: number;
  relatedStoryIds: string[];
  legacyHistoryIds: string[];
  status: "active" | "retracted";
}

export interface StoryVersion {
  id: string; // `${storyId}-v${n}`
  storyId: string;
  version: number;
  predecessorId: string | null;
  updateKind: UpdateKind;
  comparedWithVersionId?: string;
  /** Short reason recorded for the update decision (PRD §8). */
  changeReason?: string;
  /** The complete story content as generated and validated. */
  doc: StoryDoc;
  /** Verified research sources behind the historical sections. */
  researchSources: ResearchSource[];
  publishedAt: string; // ISO
  retracted?: boolean;
  correctionIds?: string[];
  schemaVersion: 1;
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
  /** Ordered, immutable references (BRF 05). Empty for quiet/unavailable. */
  storyVersionIds: string[];
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
  /** Null for a retraction. */
  replacementVersionId: string | null;
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
