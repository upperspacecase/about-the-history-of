import { AbsoluteFill, staticFile } from "remotion";
import { ShareCard } from "../src/components/share-card";
import type { HistoryResponse } from "../src/lib/history-types";

export type ReelProps = {
  doc: HistoryResponse & { headline: string };
  source?: string;
};

// Instagram overlays its own UI on the top (~Reels header) and bottom
// (~username + caption + comment bar) of a Reel. Scale the 1080x1920 card down
// into that safe band so the masthead clears the top header and the footer
// clears the username — and the cream margins blend with the card background.
const SAFE_TOP = 230;
const SAFE_BOTTOM = 410;
const SCALE = (1920 - SAFE_TOP - SAFE_BOTTOM) / 1920;

/**
 * The daily Reel: the real "Headline" share card, held static and inset into
 * Instagram's safe area.
 */
export const Reel = ({ doc, source }: ReelProps) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#faf9f6" }}>
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          left: "50%",
          transform: `translateX(-50%) scale(${SCALE})`,
          transformOrigin: "top center",
        }}
      >
        <ShareCard
          variant="title"
          data={doc}
          headline={doc.headline}
          source={source}
          logoSrc={staticFile("logo.png")}
        />
      </div>
    </AbsoluteFill>
  );
};
