import { AbsoluteFill, staticFile } from "remotion";
import { AnimatedTitleCard } from "./AnimatedTitleCard";
import { ShareSafeFrame } from "../src/components/share-safe-frame";
import type { HistoryResponse } from "../src/lib/history-types";

export type ReelProps = {
  doc: HistoryResponse & { headline: string };
  source?: string;
};

/**
 * The daily Reel: the "Headline" share card, animated — the original headline
 * types in, gets struck through, then the truth headline types in — and held
 * on a final frame identical to the static downloadable card, inset into the
 * shared 9:16 safe frame.
 */
export const Reel = ({ doc, source }: ReelProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf9f6" }}>
      <ShareSafeFrame>
        <AnimatedTitleCard
          doc={doc}
          source={source}
          logoSrc={staticFile("logo.png")}
        />
      </ShareSafeFrame>
    </AbsoluteFill>
  );
};
