import { Composition } from "remotion";
import { Demo } from "./Demo";
import { Reel, ReelProps } from "./Reel";
import sampleHistory from "./data/sample-history.json";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={25 * 30}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={
          {
            doc: sampleHistory,
            source: "New York Times",
          } satisfies ReelProps
        }
      />
    </>
  );
};
