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
        fontSize: 84,
        fontWeight: 700,
        lineHeight: 1.14,
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

export const AnimatedTitleCard = ({
  doc,
  source,
  logoSrc,
}: AnimatedTitleCardProps) => {
  const frame = useCurrentFrame();
  const headline = doc.headline;
  const truth = doc.truthHeadline?.trim() ?? "";

  // The card holds its finished state for the whole Reel; the only motion is a
  // blinking caret at the end of the truth headline.
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
          {source ? (
            <div style={{ marginBottom: 24 }}>
              <Kicker color={C.accent}>headline from {source}</Kicker>
            </div>
          ) : null}

          <Headline text={headline} color={C.muted} struck />

          <div style={{ marginTop: 40 }}>
            <Kicker color={C.accent}>The Long View Critique</Kicker>
          </div>
          <div style={{ marginTop: 14 }}>
            <Headline text={truth} color={C.truth} caret={caretBlink} />
          </div>
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
