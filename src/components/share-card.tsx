import type { CSSProperties, ReactNode } from "react";
import { SignificanceDots } from "@/components/significance-dots";
import type { HistoryResponse } from "@/lib/history-types";

export type ShareCardVariant = "title" | "timeline" | "patterns" | "matters";

export const SHARE_CARD_VARIANTS: ShareCardVariant[] = [
  "title",
  "timeline",
  "patterns",
  "matters",
];

export const SHARE_CARD_LABELS: Record<ShareCardVariant, string> = {
  title: "Headline",
  timeline: "Timeline",
  patterns: "Patterns",
  matters: "Why now",
};

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

// Brand tokens, fixed to the light theme so cards look identical regardless of
// the viewer's OS theme (globals.css flips these vars in dark mode).
const C = {
  bg: "#faf9f6",
  fg: "#111111",
  accent: "#c0392b",
  muted: "#6b6b6b",
  border: "#e0ddd8",
  card: "#ffffff",
  highlight: "#fdf6ec",
  truth: "#15803d",
};

// System fonts only — keeps image rasterization deterministic (no web fonts).
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const clamp = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

function formatSourceUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

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

function StoryEyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        marginBottom: 40,
        paddingBottom: 28,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 76,
          fontWeight: 700,
          lineHeight: 1.13,
          color: C.truth,
          ...clamp(3),
        }}
      >
        {text}
      </div>
    </div>
  );
}

interface ShareCardProps {
  variant: ShareCardVariant;
  data: HistoryResponse;
  headline: string;
  sourceUrl?: string;
}

export function ShareCard({
  variant,
  data,
  headline,
  sourceUrl,
}: ShareCardProps) {
  const truthHeadline = data.truthHeadline?.trim();
  const eyebrowText = truthHeadline || headline;
  const hasSignificance = typeof data.significance === "number";

  let body: ReactNode = null;

  if (variant === "title") {
    const sourceLine = sourceUrl ? (
      <div
        style={{
          fontFamily: SANS,
          fontSize: 24,
          color: C.muted,
          marginTop: 18,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        Source: {formatSourceUrl(sourceUrl)}
      </div>
    ) : null;
    body = (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {truthHeadline ? (
          <>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.14,
                color: C.muted,
                textDecoration: "line-through",
                textDecorationColor: "rgba(107,107,107,0.55)",
                textDecorationThickness: "4px",
              }}
            >
              {headline}
            </div>
            {sourceLine}
            <div style={{ marginTop: 40 }}>
              <Kicker color={C.accent}>The Long View Critique</Kicker>
            </div>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.14,
                color: C.truth,
                marginTop: 14,
              }}
            >
              {truthHeadline}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.14,
                color: C.fg,
              }}
            >
              {headline}
            </div>
            {sourceLine}
          </>
        )}
        {hasSignificance ? (
          <div style={{ marginTop: 64 }}>
            <Kicker>Historical significance</Kicker>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginTop: 22,
              }}
            >
              {/* SignificanceDots is sized for the website; scale it up for the
                  1080px card. Wrapper reserves the post-transform footprint. */}
              <div style={{ width: 320, height: 26, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "scale(2.6)",
                    transformOrigin: "0 0",
                  }}
                >
                  <SignificanceDots score={data.significance!} size="lg" />
                </div>
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 34,
                  fontWeight: 700,
                  color: C.fg,
                }}
              >
                {data.significance}/10
              </div>
            </div>
            {data.significanceReason ? (
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 27,
                  lineHeight: 1.4,
                  color: C.muted,
                  marginTop: 22,
                  ...clamp(2),
                }}
              >
                {data.significanceReason}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  } else if (variant === "timeline") {
    const events = data.timeline.slice(0, 5);
    body = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <StoryEyebrow text={eyebrowText} />
        <div style={{ marginBottom: 32 }}>
          <Kicker>Key moments in history</Kicker>
        </div>
        <div>
          {events.map((event, i) => (
            <div
              key={i}
              style={{
                paddingBottom: 22,
                marginBottom: 22,
                borderBottom:
                  i < events.length - 1 ? `1px solid ${C.border}` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: C.accent,
                }}
              >
                {event.year}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 36,
                  fontWeight: 700,
                  lineHeight: 1.22,
                  color: C.fg,
                  marginTop: 6,
                  ...clamp(2),
                }}
              >
                {event.title}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 25,
                  lineHeight: 1.4,
                  color: C.muted,
                  marginTop: 8,
                  ...clamp(2),
                }}
              >
                {event.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (variant === "patterns") {
    const patterns = data.patterns.slice(0, 4);
    body = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <StoryEyebrow text={eyebrowText} />
        <div style={{ marginBottom: 28 }}>
          <Kicker>Recurring patterns</Kicker>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {patterns.map((pattern, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${C.border}`,
                background: C.card,
                borderRadius: 14,
                padding: "30px 34px",
              }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 37,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: C.fg,
                }}
              >
                {pattern.title}
              </div>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 28,
                  lineHeight: 1.42,
                  color: C.muted,
                  marginTop: 12,
                  ...clamp(3),
                }}
              >
                {pattern.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <StoryEyebrow text={eyebrowText} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: C.highlight,
              border: "1px solid rgba(192,57,43,0.22)",
              borderRadius: 18,
              padding: "52px",
            }}
          >
            <Kicker color={C.accent}>Why this matters now</Kicker>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 43,
                lineHeight: 1.46,
                color: C.fg,
                marginTop: 28,
              }}
            >
              {data.whyItMattersNow}
            </div>
          </div>
          {data.topic ? (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 22,
                letterSpacing: "0.04em",
                color: C.muted,
                marginTop: 28,
              }}
            >
              On {data.topic}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
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
        "--background": C.bg,
        "--foreground": C.fg,
        "--accent": C.accent,
        "--muted": C.muted,
        "--border": C.border,
        "--card": C.card,
        "--highlight": C.highlight,
      } as CSSProperties}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 69,
              height: 48,
              flexShrink: 0,
              backgroundImage: "url(/logo.png)",
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "left center",
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
        {body}
      </div>

      <div style={{ flexShrink: 0 }}>
        <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: C.accent,
          }}
        >
          thelongview.org
        </div>
      </div>
    </div>
  );
}
