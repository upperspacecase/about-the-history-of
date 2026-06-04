import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import {
  C,
  SANS,
  SERIF,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
} from "../src/components/share-card";
import type { HistoryResponse } from "../src/lib/history-types";

// Animation beats at 30fps (the composition is 232 frames ≈ 7.7s). The final
// held state is pixel-identical to the static ShareCard "title" variant.
const T1_START = 10;
const T1_DUR = 42; // original headline types out: 10 → 52
const STRIKE_START = 66;
const STRIKE_DUR = 12; // crossed out: 66 → 78
const CRIT_START = 84;
const CRIT_DUR = 12; // "The Long View Critique" label fades in: 84 → 96
const T2_START = 96;
const T2_DUR = 50; // truth headline types out: 96 → 146
// 146 → end: hold on the finished card.

function Kicker({
  children,
  color = C.muted,
  opacity = 1,
}: {
  children: ReactNode;
  color?: string;
  opacity?: number;
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
        opacity,
      }}
    >
      {children}
    </div>
  );
}

// A headline that types in. The untyped tail is rendered transparent so the
// card's wrap and vertical centering never shift as characters appear.
function TypedHeadline({
  text,
  shown,
  color,
  strikeAlpha,
  caret,
}: {
  text: string;
  shown: number;
  color: string;
  strikeAlpha: number;
  caret: number | null;
}) {
  return (
    <div
      style={{
        fontFamily: SERIF,
        fontSize: 74,
        fontWeight: 700,
        lineHeight: 1.14,
      }}
    >
      <span
        style={{
          color,
          textDecorationLine: strikeAlpha > 0 ? "line-through" : "none",
          textDecorationColor: `rgba(107,107,107,${strikeAlpha})`,
          textDecorationThickness: "4px",
        }}
      >
        {text.slice(0, shown)}
      </span>
      {caret !== null && (
        <span style={{ color, opacity: caret, fontWeight: 400 }}>|</span>
      )}
      <span style={{ color: "transparent" }}>{text.slice(shown)}</span>
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

  const clampOpts = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };

  const origShown = Math.round(
    interpolate(frame, [T1_START, T1_START + T1_DUR], [0, headline.length], clampOpts)
  );
  const strike = interpolate(
    frame,
    [STRIKE_START, STRIKE_START + STRIKE_DUR],
    [0, 1],
    clampOpts
  );
  const grey = Math.round(interpolate(strike, [0, 1], [17, 107]));
  const critOpacity = interpolate(
    frame,
    [CRIT_START, CRIT_START + CRIT_DUR],
    [0, 1],
    clampOpts
  );
  const truthShown = Math.round(
    interpolate(frame, [T2_START, T2_START + T2_DUR], [0, truth.length], clampOpts)
  );

  const caretBlink = Math.floor(frame / 9) % 2 === 0 ? 1 : 0.2;
  // Caret rides the original while it types and during the pause before the
  // strike; then moves to the truth headline while that types.
  const origCaret = frame < STRIKE_START ? caretBlink : null;
  const truthCaret =
    frame >= T2_START && frame < T2_START + T2_DUR + 6 ? caretBlink : null;

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

          <TypedHeadline
            text={headline}
            shown={origShown}
            color={`rgb(${grey},${grey},${grey})`}
            strikeAlpha={0.55 * strike}
            caret={origCaret}
          />

          <div style={{ marginTop: 40 }}>
            <Kicker color={C.accent} opacity={critOpacity}>
              The Long View Critique
            </Kicker>
          </div>
          <div style={{ marginTop: 14 }}>
            <TypedHeadline
              text={truth}
              shown={truthShown}
              color={C.truth}
              strikeAlpha={0}
              caret={truthCaret}
            />
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
