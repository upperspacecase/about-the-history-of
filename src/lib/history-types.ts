export interface TimelineEvent {
  year: string;
  title: string;
  description: string;
  link: string;
}

export interface Pattern {
  title: string;
  description: string;
}

export interface FurtherReading {
  title: string;
  author: string;
  type: string;
  link: string;
}

/** How the event sits against the historical record. */
export const EVENT_CLASSIFICATIONS = [
  "Routine",
  "Recurring",
  "Accelerating",
  "Structural",
  "Era-defining",
] as const;

export type EventClassification = (typeof EVENT_CLASSIFICATIONS)[number];

export type ConfidenceLevel = "Low" | "Medium" | "High";

/**
 * The five significance dimensions, each 0-2 points. The displayed score is
 * always the sum of these components.
 */
export interface ScoreBreakdown {
  scale: number;
  durability: number;
  institutionalChange: number;
  novelty: number;
  spillovers: number;
}

export interface Precedent {
  /** A specific, named historical precedent. Never a vague era or trend. */
  name: string;
  /** Why the precedent is genuinely comparable. */
  similarity: string;
  /** The concrete way this event differs from the precedent. */
  crucialDifference: string;
}

export interface WhatWouldChange {
  /** Future evidence that would raise the significance score. */
  raise: string;
  /** Future evidence that would lower the significance score. */
  lower: string;
}

export interface SupportingSource {
  publisher: string;
  title: string;
  url: string;
  publishedAt?: string;
}

/**
 * The three daily card categories. These describe the story's role in the
 * briefing, not a headline template.
 */
export type CardRole = "shift" | "pattern" | "noise";

/** A visible entry in the public correction and revision log. */
export interface Revision {
  at: string;
  note: string;
  previousScore?: number;
  newScore?: number;
}

export interface HistoryResponse {
  topic: string;
  summary: string;
  /** The Long View verdict headline (field name kept for stored documents). */
  truthHeadline?: string;
  /** Provisional significance: the sum of the five score components. */
  significance?: number;
  significanceReason?: string;
  classification?: EventClassification;
  scoreBreakdown?: ScoreBreakdown;
  confidence?: ConfidenceLevel;
  confidenceReasons?: string[];
  precedent?: Precedent;
  whatWouldChange?: WhatWouldChange;
  sources?: SupportingSource[];
  sourceHeadline?: string;
  sourcePublisher?: string;
  sourceUrl?: string;
  cardRole?: CardRole;
  generatedAtIso?: string;
  updatedAtIso?: string;
  revisions?: Revision[];
  timeline: TimelineEvent[];
  patterns: Pattern[];
  furtherReading: FurtherReading[];
  whyItMattersNow: string;
}
