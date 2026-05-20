"use client";

import { useRef, useState } from "react";
import {
  ShareCard,
  SHARE_CARD_VARIANTS,
  SHARE_CARD_LABELS,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  type ShareCardVariant,
} from "@/components/share-card";
import { cardFileName, nodeToPngFile, shareOrDownload } from "@/lib/share-card";
import type { HistoryResponse } from "@/lib/history-types";

const PREVIEW_WIDTH = 260;
const SCALE = PREVIEW_WIDTH / SHARE_CARD_WIDTH;

interface Props {
  data: HistoryResponse;
  headline: string;
  sourceUrl?: string;
}

export function ShareStory({ data, headline, sourceUrl }: Props) {
  const cardRefs = useRef<Record<ShareCardVariant, HTMLDivElement | null>>({
    title: null,
    timeline: null,
    patterns: null,
    matters: null,
  });
  const [busy, setBusy] = useState<ShareCardVariant | "all" | null>(null);
  const [error, setError] = useState("");

  const storyTitle = data.truthHeadline || headline;
  const meta = {
    title: storyTitle,
    text: `${storyTitle} — the history behind the headline. thelongview.org`,
  };

  async function shareVariants(
    variants: readonly ShareCardVariant[],
    busyKey: ShareCardVariant | "all"
  ) {
    setError("");
    setBusy(busyKey);
    try {
      const files = await Promise.all(
        variants.map((variant) => {
          const node = cardRefs.current[variant];
          if (!node) throw new Error("Card not ready");
          return nodeToPngFile(node, cardFileName(headline, variant));
        })
      );
      await shareOrDownload(files, meta);
    } catch {
      setError("Couldn't generate the image — try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted mb-2">
        Share this story
      </h3>
      <p className="text-sm text-muted mb-6">
        Four portrait cards, ready for Instagram, LinkedIn, or X. What you see
        here is exactly what gets shared.
      </p>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {SHARE_CARD_VARIANTS.map((variant) => (
          <div key={variant} className="shrink-0">
            <div
              className="rounded-lg border border-border overflow-hidden bg-card"
              style={{
                width: PREVIEW_WIDTH,
                height: SHARE_CARD_HEIGHT * SCALE,
              }}
            >
              <div
                style={{
                  width: SHARE_CARD_WIDTH,
                  height: SHARE_CARD_HEIGHT,
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  ref={(el) => {
                    cardRefs.current[variant] = el;
                  }}
                >
                  <ShareCard
                    variant={variant}
                    data={data}
                    headline={headline}
                    sourceUrl={sourceUrl}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => shareVariants([variant], variant)}
              disabled={busy !== null}
              className="mt-2 w-full px-3 py-2 rounded-md border border-border text-sm hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === variant
                ? "Preparing…"
                : `Share ${SHARE_CARD_LABELS[variant]}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={() => shareVariants(SHARE_CARD_VARIANTS, "all")}
          disabled={busy !== null}
          className="px-5 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "all" ? "Preparing…" : "Share all four"}
        </button>
        {error ? <span className="text-sm text-accent">{error}</span> : null}
      </div>
    </section>
  );
}
