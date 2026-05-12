import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import sampleHistory from "../data/sample-history.json";

const SOURCE_LABEL = "NEW YORK TIMES";
const BRAND = "The Long View";
const ACCENT_GREEN = "#15803d"; // matches Tailwind green-700 used on the live page

const CANVAS = { width: 1920, height: 1080 };
const CONTENT_WIDTH = 1100;
const HEADER_HEIGHT = 88;

// Phases (30 fps)
const SHIMMER_END = 75; // 2.5s of generating shimmer
const FADE_FRAMES = 18;
const REWRITE_START = SHIMMER_END; // truth headline + significance fade in
const REWRITE_DONE = REWRITE_START + FADE_FRAMES;
const ARTICLE_START = REWRITE_DONE + 6; // small beat after the headline rewrite
const SCROLL_START = ARTICLE_START + 36; // ~1.2s pause to read the headline+score
const SCROLL_END = 600; // composition end

export const HistoryPage = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const navProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 18,
  });

  const headlineProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  const shimmerOpacity = interpolate(
    frame,
    [SHIMMER_END - FADE_FRAMES, SHIMMER_END],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Headline rewrite reveal — truthHeadline fades in above, original gets
  // a strike-through line that grows left → right at the same time.
  const rewriteProgress = interpolate(
    frame,
    [REWRITE_START, REWRITE_DONE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const truthLift = (1 - rewriteProgress) * 10;

  // Significance dots cascade in just after the truth headline lands.
  const SIG_START = REWRITE_DONE - 4;
  const sigOpacity = interpolate(
    frame,
    [SIG_START, SIG_START + FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const articleOpacity = interpolate(
    frame,
    [ARTICLE_START, ARTICLE_START + FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const articleLift = interpolate(
    frame,
    [ARTICLE_START, ARTICLE_START + FADE_FRAMES],
    [12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Smooth scroll from 0 to ARTICLE_TOTAL_HEIGHT - viewport
  // Estimated content height: header (88) + headline block (~260) + summary (~280)
  // + timeline (11 events × ~140 = 1540) + patterns (~440) + why (~220) + further reading (~580)
  // Total ≈ 3400. We need to scroll past the visible viewport (1080 - 88 = 992).
  const SCROLL_DISTANCE = 2400;
  const scrollProgress = interpolate(
    frame,
    [SCROLL_START, SCROLL_END],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (x) => x * x * (3 - 2 * x),
    }
  );
  const scrollY = scrollProgress * SCROLL_DISTANCE;

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: theme.sans,
      }}
    >
      {/* Top nav bar — sticky */}
      <div
        style={{
          height: HEADER_HEIGHT,
          borderBottom: `1px solid ${theme.border}`,
          padding: "0 140px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: navProgress,
          background: theme.background,
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: theme.muted,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          ← All Headlines
        </div>
        <div style={{ width: 1, height: 18, background: theme.border }} />
        <div
          style={{
            fontFamily: theme.serif,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {BRAND}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 14,
            color: theme.muted,
            border: `1px solid ${theme.border}`,
            borderRadius: 999,
            padding: "8px 16px",
          }}
        >
          Sign in with Google
        </div>
      </div>

      {/* Scrolling content viewport */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: CONTENT_WIDTH,
            margin: "0 auto",
            padding: "56px 0",
            transform: `translateY(${-scrollY}px)`,
          }}
        >
          {/* Headline (always visible during shimmer + article).
              Starts as the original headline; after the shimmer, the
              truth-headline fades in above and the original is struck
              through, mirroring the live history page. */}
          <div
            style={{
              paddingBottom: 36,
              borderBottom: `1px solid ${theme.border}`,
              marginBottom: 48,
              opacity: headlineProgress,
              transform: `translateY(${(1 - headlineProgress) * 14}px)`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: theme.accent,
                fontWeight: 600,
              }}
            >
              {SOURCE_LABEL}
            </div>

            {/* Truth headline — fades in once the shimmer ends */}
            <h1
              style={{
                fontFamily: theme.serif,
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.1,
                margin: "12px 0 14px",
                letterSpacing: "-0.01em",
                color: ACCENT_GREEN,
                opacity: rewriteProgress,
                transform: `translateY(${truthLift}px)`,
                minHeight: rewriteProgress > 0 ? undefined : 0,
              }}
            >
              {sampleHistory.truthHeadline}
            </h1>

            {/* Original headline — gets struck through left-to-right as
                the truth headline lands */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                maxWidth: "100%",
              }}
            >
              <h2
                style={{
                  fontFamily: theme.serif,
                  fontSize: rewriteProgress > 0 ? 30 : 52,
                  fontWeight: rewriteProgress > 0 ? 500 : 700,
                  lineHeight: 1.15,
                  margin: rewriteProgress > 0 ? "0 0 14px" : "12px 0 16px",
                  color: rewriteProgress > 0 ? theme.muted : theme.foreground,
                  transition: "none",
                  letterSpacing: "-0.005em",
                }}
              >
                {sampleHistory.headline}
              </h2>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  height: 2,
                  width: `${rewriteProgress * 100}%`,
                  background: theme.muted,
                  opacity: 0.7,
                  transform: "translateY(-1px)",
                }}
              />
            </div>

            {/* Significance row — appears just after the truth headline */}
            <div
              style={{
                marginTop: 18,
                opacity: sigOpacity,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: theme.muted,
                  }}
                >
                  Historical significance
                </span>
                <SignificanceDots score={sampleHistory.significance} />
                <span
                  style={{
                    fontSize: 14,
                    fontFamily: "ui-monospace, monospace",
                    color: theme.muted,
                  }}
                >
                  {sampleHistory.significance}/10
                </span>
              </div>
              <p
                style={{
                  fontSize: 16,
                  color: theme.muted,
                  lineHeight: 1.5,
                  margin: 0,
                  maxWidth: 820,
                }}
              >
                {sampleHistory.significanceReason}
              </p>
            </div>

            <div
              style={{
                fontSize: 15,
                color: theme.muted,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 18,
              }}
            >
              Read original article ↗
            </div>
          </div>

          {/* Generation shimmer — fades out around frame 75 */}
          {frame < SHIMMER_END && (
            <div
              style={{
                opacity: shimmerOpacity,
                position: "relative",
              }}
            >
              <Shimmer />
              <div
                style={{
                  textAlign: "center",
                  fontSize: 16,
                  color: theme.muted,
                  paddingTop: 24,
                }}
              >
                <RotatingStage frame={frame} fps={fps} />
              </div>
            </div>
          )}

          {/* Article — fades in after shimmer */}
          {frame >= ARTICLE_START && (
            <div
              style={{
                opacity: articleOpacity,
                transform: `translateY(${articleLift}px)`,
              }}
            >
              {/* Topic & Summary */}
              <section style={{ marginBottom: 64 }}>
                <h2
                  style={{
                    fontFamily: theme.serif,
                    fontSize: 36,
                    fontWeight: 700,
                    margin: "0 0 14px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {sampleHistory.topic}
                </h2>
                <p
                  style={{
                    fontSize: 22,
                    lineHeight: 1.6,
                    color: theme.muted,
                    margin: 0,
                  }}
                >
                  {sampleHistory.summary}
                </p>
              </section>

              {/* Timeline */}
              <section style={{ marginBottom: 64 }}>
                <SectionLabel>Key Moments in History</SectionLabel>
                <div
                  style={{
                    position: "relative",
                    paddingLeft: 36,
                    borderLeft: `2px solid ${theme.border}`,
                    marginTop: 28,
                  }}
                >
                  {sampleHistory.timeline.map((event, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 32,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: -46,
                          top: 4,
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          background: "rgba(192, 57, 43, 0.15)",
                          border: `2px solid ${theme.accent}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: theme.accent,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 16,
                          color: theme.accent,
                          fontWeight: 600,
                        }}
                      >
                        {event.year}
                      </div>
                      <div
                        style={{
                          fontFamily: theme.serif,
                          fontSize: 22,
                          fontWeight: 600,
                          margin: "2px 0 4px",
                        }}
                      >
                        {event.title}
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          color: theme.muted,
                          lineHeight: 1.55,
                        }}
                      >
                        {event.description}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Patterns */}
              <section style={{ marginBottom: 64 }}>
                <SectionLabel>Recurring Patterns</SectionLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginTop: 24,
                  }}
                >
                  {sampleHistory.patterns.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 24,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.card,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: theme.serif,
                          fontSize: 20,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          color: theme.muted,
                          lineHeight: 1.55,
                        }}
                      >
                        {p.description}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Why it matters */}
              <section
                style={{
                  padding: 28,
                  borderRadius: 10,
                  border: `1px solid rgba(192, 57, 43, 0.2)`,
                  background: theme.highlight,
                  marginBottom: 64,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: theme.accent,
                    marginBottom: 12,
                    fontWeight: 600,
                  }}
                >
                  Why This Matters Now
                </div>
                <div
                  style={{
                    fontFamily: theme.serif,
                    fontSize: 22,
                    lineHeight: 1.5,
                  }}
                >
                  {sampleHistory.whyItMattersNow}
                </div>
              </section>

              {/* Further Reading */}
              {sampleHistory.furtherReading?.length > 0 && (
                <section style={{ marginBottom: 32 }}>
                  <SectionLabel>Further Reading</SectionLabel>
                  <div
                    style={{
                      marginTop: 24,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {sampleHistory.furtherReading.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 18,
                          borderRadius: 10,
                          border: `1px solid ${theme.border}`,
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: "rgba(192, 57, 43, 0.1)",
                            color: theme.accent,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {item.type === "book"
                            ? "B"
                            : item.type === "documentary"
                              ? "D"
                              : "A"}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 17,
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              color: theme.muted,
                              fontSize: 14,
                              marginTop: 2,
                            }}
                          >
                            {item.author} ·{" "}
                            <span style={{ textTransform: "capitalize" }}>
                              {item.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: "0.18em",
      color: theme.muted,
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);

const SignificanceDots = ({ score }: { score: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    {Array.from({ length: 10 }).map((_, i) => (
      <span
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: i < score ? theme.accent : theme.border,
          display: "inline-block",
        }}
      />
    ))}
  </div>
);

const STAGES = [
  "Searching the archive…",
  "Tracing the timeline…",
  "Identifying recurring patterns…",
  "Scoring its place in history…",
  "Writing the truth headline…",
];

const RotatingStage = ({ frame, fps }: { frame: number; fps: number }) => {
  const dwell = Math.max(1, Math.round(fps * 0.6));
  const idx = Math.min(STAGES.length - 1, Math.floor(frame / dwell));
  return <span>{STAGES[idx]}</span>;
};

const Shimmer = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pulsing opacity, mirrors animate-pulse-bar from the live UI
  const pulse = (delay: number) => {
    const phase = ((frame - delay) / fps) * (1000 / 1500); // 1.5s period
    const t = phase - Math.floor(phase);
    const wave = Math.sin(t * Math.PI * 2);
    return interpolate(wave, [-1, 1], [0.4, 1]);
  };

  const Bar = ({
    width,
    delay,
    height = 16,
  }: {
    width: string;
    delay: number;
    height?: number;
  }) => (
    <div
      style={{
        height,
        width,
        background: theme.border,
        borderRadius: 4,
        opacity: pulse(delay),
      }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Bar width="60%" delay={0} height={22} />
        <Bar width="92%" delay={4} height={16} />
        <Bar width="78%" delay={8} height={16} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 18 }}>
            <Bar width="80px" delay={12 + i * 5} height={16} />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <Bar width="70%" delay={14 + i * 5} height={16} />
              <Bar width="50%" delay={16 + i * 5} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
