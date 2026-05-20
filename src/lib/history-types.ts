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
