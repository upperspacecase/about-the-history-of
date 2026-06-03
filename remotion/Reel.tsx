import { AbsoluteFill, staticFile } from "remotion";
import { ShareCard } from "../src/components/share-card";
import type { HistoryResponse } from "../src/lib/history-types";

export type ReelProps = {
  doc: HistoryResponse & { headline: string };
  source?: string;
};

/**
 * The daily Reel is the real "Headline" share card — the first shareable asset
 * on the history page — held static for the composition's duration. No
 * animation; the card is the content.
 */
export const Reel = ({ doc, source }: ReelProps) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#faf9f6",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ShareCard
        variant="title"
        data={doc}
        headline={doc.headline}
        source={source}
        logoSrc={staticFile("logo.png")}
      />
    </AbsoluteFill>
  );
};
