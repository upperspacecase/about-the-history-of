import { Composition } from "remotion";
import { Demo } from "./Demo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Demo"
      component={Demo}
      durationInFrames={18 * 30}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
