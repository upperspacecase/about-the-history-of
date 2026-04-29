import { AbsoluteFill } from "remotion";
import { HistoryPage } from "./scenes/HistoryPage";
import { theme } from "./theme";

export const Demo = () => {
  return (
    <AbsoluteFill style={{ background: theme.background }}>
      <HistoryPage />
    </AbsoluteFill>
  );
};
