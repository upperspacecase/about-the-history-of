import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme, HISTORY } from "../theme";

export const HistoryPage = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const navProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 18,
  });

  const headlineDelay = 8;
  const headlineProgress = spring({
    frame: frame - headlineDelay,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  const summaryDelay = 1.2 * fps;
  const summaryProgress = spring({
    frame: frame - summaryDelay,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  const timelineStart = 2.2 * fps;

  const patternsStart = 6.2 * fps;
  const patternsProgress = spring({
    frame: frame - patternsStart,
    fps,
    config: { damping: 200 },
    durationInFrames: 22,
  });

  const whyStart = 8 * fps;
  const whyProgress = spring({
    frame: frame - whyStart,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });

  const scrollFrame = 3.5 * fps;
  const scrollY = interpolate(frame, [scrollFrame, 10 * fps], [0, -360], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (x) => x * x * (3 - 2 * x),
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: theme.sans,
      }}
    >
      {/* Top nav bar */}
      <div
        style={{
          borderBottom: `1px solid ${theme.border}`,
          padding: "20px 140px",
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
            fontSize: 16,
            color: theme.muted,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← All Headlines
        </div>
        <div style={{ width: 1, height: 16, background: theme.border }} />
        <div style={{ fontFamily: theme.serif, fontSize: 18, fontWeight: 600 }}>
          About the History of...
        </div>
      </div>

      <div
        style={{
          padding: "48px 260px",
          transform: `translateY(${scrollY}px)`,
        }}
      >
        {/* Original headline */}
        <div
          style={{
            paddingBottom: 40,
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
            BBC
          </div>
          <h1
            style={{
              fontFamily: theme.serif,
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.08,
              margin: "12px 0 16px",
            }}
          >
            {HISTORY.headline}
          </h1>
          <div style={{ fontSize: 15, color: theme.muted }}>
            Read original article ↗
          </div>
        </div>

        {/* Topic & summary */}
        <section
          style={{
            opacity: summaryProgress,
            transform: `translateY(${(1 - summaryProgress) * 12}px)`,
            marginBottom: 56,
          }}
        >
          <h2
            style={{
              fontFamily: theme.serif,
              fontSize: 40,
              fontWeight: 700,
              margin: "0 0 14px",
            }}
          >
            {HISTORY.topic}
          </h2>
          <p
            style={{
              fontSize: 22,
              lineHeight: 1.55,
              color: theme.muted,
              margin: 0,
            }}
          >
            {HISTORY.summary}
          </p>
        </section>

        {/* Timeline */}
        <section style={{ marginBottom: 56 }}>
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: theme.muted,
              marginBottom: 28,
              fontWeight: 600,
            }}
          >
            Key Moments in History
          </div>
          <div
            style={{
              position: "relative",
              paddingLeft: 36,
              borderLeft: `2px solid ${theme.border}`,
            }}
          >
            {HISTORY.timeline.map((event, i) => {
              const delay = timelineStart + i * 14;
              const p = spring({
                frame: frame - delay,
                fps,
                config: { damping: 200 },
                durationInFrames: 22,
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity: p,
                    transform: `translateX(${(1 - p) * -18}px)`,
                    marginBottom: 28,
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
                      lineHeight: 1.5,
                    }}
                  >
                    {event.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Patterns */}
        <section
          style={{
            opacity: patternsProgress,
            transform: `translateY(${(1 - patternsProgress) * 14}px)`,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: theme.muted,
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            Recurring Patterns
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {HISTORY.patterns.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: 22,
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
                    lineHeight: 1.5,
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
            opacity: whyProgress,
            transform: `translateY(${(1 - whyProgress) * 14}px)`,
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
              fontSize: 24,
              lineHeight: 1.45,
            }}
          >
            {HISTORY.whyItMattersNow}
          </div>
        </section>
      </div>
    </AbsoluteFill>
  );
};
