import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import {
  C,
  SANS,
  SERIF,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from "../src/components/share-card";
import type { HistoryResponse } from "../src/lib/history-types";

function Kicker({
  children,
  color = C.muted,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  );
}

// A headline shown in full. Optionally struck through, with an optional
// blinking caret rendered at the end.
function Headline({
  text,
  color,
  struck = false,
  caret = null,
}: {
  text: string;
  color: string;
  struck?: boolean;
  caret?: number | null;
}) {
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 68,
        fontWeight: 700,
        lineHeight: 1.16,
      }}
    >
      <span
        style={{
          color,
          textDecorationLine: struck ? "line-through" : "none",
          textDecorationColor: "rgba(107,107,107,0.55)",
          textDecorationThickness: "4px",
        }}
      >
        {text}
      </span>
      {caret !== null && (
        <span style={{ color, opacity: caret, fontWeight: 400 }}>|</span>
      )}
    </div>
  );
}

export type AnimatedTitleCardProps = {
  doc: HistoryResponse & { headline: string };
  source?: string;
  logoSrc: string;
};

function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

export const AnimatedTitleCard = ({
  doc,
  source,
  logoSrc,
}: AnimatedTitleCardProps) => {
  const frame = useCurrentFrame();
  const editorial = doc.truthHeadline?.trim() || doc.headline;
  const explanation = clampText(
    (doc.whatChanged ?? doc.summary ?? "").trim(),
    260
  );
  const qualification = clampText((doc.uncertainties ?? [])[0] ?? "", 160);

  // The card holds its finished state for the whole Reel; the only motion is
  // a blinking caret at the end of the editorial headline.
  const caretBlink = Math.floor(frame / 9) % 2 === 0 ? 1 : 0.2;

  return (
    <div
      style={
        {
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          flexShrink: 0,
          boxSizing: "border-box",
          overflow: "hidden",
          background: C.bg,
          color: C.fg,
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px 54px",
        } as CSSProperties
      }
    >
      {/* Masthead */}
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 69,
              height: 48,
              flexShrink: 0,
              backgroundImage: `url(${logoSrc})`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          />
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: C.fg,
            }}
          >
            The Long View
          </div>
        </div>
        <div style={{ height: 2, background: C.fg, marginTop: 14 }} />
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          paddingTop: 48,
          paddingBottom: 40,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Kicker color={C.accent}>In context</Kicker>
          </div>

          <Headline text={editorial} color={C.fg} caret={caretBlink} />

          {explanation ? (
            <div
              style={{
                marginTop: 36,
                fontFamily: SANS,
                fontSize: 36,
                lineHeight: 1.4,
                color: C.fg,
              }}
            >
              <span style={{ fontWeight: 700 }}>What changed: </span>
              {explanation}
            </div>
          ) : null}

          {qualification ? (
            <div
              style={{
                marginTop: 22,
                fontFamily: SANS,
                fontSize: 30,
                lineHeight: 1.4,
                color: C.muted,
              }}
            >
              {qualification}
            </div>
          ) : null}

          {source ? (
            <div style={{ marginTop: 30 }}>
              <Kicker color={C.muted}>Reported by {source}</Kicker>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: C.accent,
            textAlign: "center",
          }}
        >
          thelongview.org
        </div>
      </div>
    </div>
  );
};
