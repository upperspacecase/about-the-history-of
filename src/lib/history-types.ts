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

// Legacy stored shape of the headline-keyed `histories` collection. Read-only
// since PRD v2: nothing generates new headline-only histories any more.
export interface HistoryDoc
  extends Required<
      Pick<
        HistoryResponse,
        "truthHeadline" | "significance" | "significanceReason"
      >
    >,
    Omit<
      HistoryResponse,
      "truthHeadline" | "significance" | "significanceReason"
    > {
  headline: string;
}

export interface HistoryResponse {
  topic: string;
  summary: string;
  truthHeadline?: string;
  significance?: number;
  significanceReason?: string;
  timeline: TimelineEvent[];
  patterns: Pattern[];
  furtherReading: FurtherReading[];
  whyItMattersNow: string;
}
