import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import { Homepage } from "./scenes/Homepage";
import { HistoryPage } from "./scenes/HistoryPage";
import { theme } from "./theme";

const HOMEPAGE_DURATION = 6 * 30;
const HISTORY_DURATION = 12 * 30;
const TRANSITION_FRAMES = 18;

export const Demo = () => {
  const frame = useCurrentFrame();

  const transitionStart = HOMEPAGE_DURATION - TRANSITION_FRAMES / 2;
  const fade = interpolate(
    frame,
    [transitionStart, transitionStart + TRANSITION_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <Sequence
        from={0}
        durationInFrames={HOMEPAGE_DURATION + TRANSITION_FRAMES}
        premountFor={30}
      >
        <AbsoluteFill style={{ opacity: 1 - fade }}>
          <Homepage />
        </AbsoluteFill>
      </Sequence>

      <Sequence
        from={HOMEPAGE_DURATION - TRANSITION_FRAMES / 2}
        durationInFrames={HISTORY_DURATION + TRANSITION_FRAMES}
        premountFor={30}
      >
        <AbsoluteFill style={{ opacity: fade }}>
          <HistoryPage />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
