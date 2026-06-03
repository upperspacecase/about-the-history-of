import { AbsoluteFill, staticFile } from "remotion";
import { ShareCard } from "../src/components/share-card";
import { ShareSafeFrame } from "../src/components/share-safe-frame";
import type { HistoryResponse } from "../src/lib/history-types";

export type ReelProps = {
  doc: HistoryResponse & { headline: string };
  source?: string;
};

/**
 * The daily Reel: the real "Headline" share card, held static and inset into
 * the shared 9:16 safe frame (same as the downloadable cards).
 */
export const Reel = ({ doc, source }: ReelProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf9f6" }}>
      <ShareSafeFrame>
        <ShareCard
          variant="title"
          data={doc}
          headline={doc.headline}
          source={source}
          logoSrc={staticFile("logo.png")}
        />
      </ShareSafeFrame>
    </AbsoluteFill>
  );
};
