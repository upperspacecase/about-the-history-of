import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme, HEADLINES } from "../theme";

export const Homepage = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mastheadProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });
  const mastheadOpacity = mastheadProgress;
  const mastheadY = interpolate(mastheadProgress, [0, 1], [-20, 0]);

  const lead = HEADLINES[0];
  const secondary = HEADLINES.slice(1, 4);
  const rest = HEADLINES.slice(4);

  const leadDelay = 20;
  const leadProgress = spring({
    frame: frame - leadDelay,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });

  const hoverFrame = 4.2 * fps;
  const hoverActive = frame > hoverFrame;
  const accentOpacity = interpolate(
    frame,
    [hoverFrame, hoverFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ctaProgress = spring({
    frame: frame - (hoverFrame + 6),
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  });

  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        color: theme.foreground,
        fontFamily: theme.sans,
        padding: "60px 140px",
      }}
    >
      {/* Masthead */}
      <div
        style={{
          textAlign: "center",
          opacity: mastheadOpacity,
          transform: `translateY(${mastheadY}px)`,
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: 24,
          marginBottom: 24,
        }}
      >
        <p
          style={{
            fontSize: 16,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: theme.muted,
            marginBottom: 12,
          }}
        >
          Tuesday, May 12, 2026
        </p>
        <h1
          style={{
            fontFamily: theme.serif,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          The Long View
        </h1>
        <p style={{ fontSize: 22, color: theme.muted, marginTop: 12 }}>
          Headlines through a corrective lens
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 36,
            marginTop: 24,
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: theme.muted,
          }}
        >
          <span>World</span>
          <span>U.S.</span>
          <span>Politics</span>
          <span>Business</span>
          <span>Science</span>
          <span>Technology</span>
        </div>
      </div>

      {/* Content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 56,
          paddingBottom: 32,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {/* Lead */}
        <div
          style={{
            opacity: leadProgress,
            transform: `translateY(${(1 - leadProgress) * 16}px)`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: theme.accent,
            }}
          >
            {lead.source} / {lead.category}
          </div>
          <h2
            style={{
              fontFamily: theme.serif,
              fontSize: 60,
              lineHeight: 1.05,
              fontWeight: 700,
              margin: "12px 0 16px",
              color: hoverActive
                ? `rgba(192, 57, 43, ${accentOpacity})`
                : theme.foreground,
              transition: "color 0.3s",
            }}
          >
            {lead.title}
          </h2>
          <p
            style={{
              color: theme.muted,
              fontSize: 22,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {lead.snippet}
          </p>
          <div
            style={{
              marginTop: 18,
              fontSize: 18,
              color: theme.accent,
              fontWeight: 600,
              opacity: ctaProgress,
              transform: `translateX(${(1 - ctaProgress) * -8}px)`,
            }}
          >
            Read the history →
          </div>
        </div>

        {/* Secondary */}
        <div
          style={{
            borderLeft: `1px solid ${theme.border}`,
            paddingLeft: 40,
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {secondary.map((h, i) => {
            const delay = 30 + i * 8;
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
                  transform: `translateY(${(1 - p) * 12}px)`,
                  paddingBottom: i < secondary.length - 1 ? 24 : 0,
                  borderBottom:
                    i < secondary.length - 1
                      ? `1px solid ${theme.border}`
                      : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: theme.muted,
                    fontWeight: 600,
                  }}
                >
                  {h.source}
                </div>
                <h3
                  style={{
                    fontFamily: theme.serif,
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    margin: "6px 0 4px",
                  }}
                >
                  {h.title}
                </h3>
                <div style={{ fontSize: 13, color: theme.muted }}>{h.date}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* More headlines */}
      <div style={{ paddingTop: 32 }}>
        <div
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: theme.muted,
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          More Headlines
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "28px 40px",
          }}
        >
          {rest.map((h, i) => {
            const delay = 60 + i * 6;
            const p = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200 },
              durationInFrames: 20,
            });
            return (
              <div
                key={i}
                style={{
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                  paddingBottom: 20,
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: theme.muted,
                    fontWeight: 600,
                  }}
                >
                  {h.source}
                </div>
                <div
                  style={{
                    fontFamily: theme.serif,
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.25,
                    margin: "6px 0 4px",
                  }}
                >
                  {h.title}
                </div>
                {h.snippet && (
                  <div
                    style={{
                      fontSize: 14,
                      color: theme.muted,
                      lineHeight: 1.4,
                    }}
                  >
                    {h.snippet}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cursor */}
      <Cursor />
    </AbsoluteFill>
  );
};

const Cursor = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const start = { x: 1600, y: 80 };
  const end = { x: 520, y: 420 };
  const moveStart = 2.8 * fps;
  const moveEnd = 4.2 * fps;

  const t = interpolate(frame, [moveStart, moveEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const x = interpolate(t, [0, 1], [start.x, end.x]);
  const y = interpolate(t, [0, 1], [start.y, end.y]);

  const appearOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const clickFrame = 4.4 * fps;
  const clickScale = interpolate(
    frame,
    [clickFrame, clickFrame + 4, clickFrame + 12],
    [1, 0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: appearOpacity,
        transform: `scale(${clickScale})`,
        pointerEvents: "none",
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3l14 7-6 2-2 6-6-15z"
          fill={theme.foreground}
          stroke="#fff"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  );
};
