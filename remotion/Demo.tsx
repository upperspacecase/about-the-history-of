import { AbsoluteFill, Sequence } from "remotion";
import { Homepage } from "./scenes/Homepage";
import { HistoryPage } from "./scenes/HistoryPage";
import { theme } from "./theme";

const HOMEPAGE_FRAMES = 5 * 30;

export const Demo = () => {
  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <Sequence durationInFrames={HOMEPAGE_FRAMES}>
        <Homepage />
      </Sequence>
      <Sequence from={HOMEPAGE_FRAMES}>
        <HistoryPage />
      </Sequence>
    </AbsoluteFill>
  );
};
