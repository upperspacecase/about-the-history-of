import type { ReactNode } from "react";

// Instagram (and other 9:16 surfaces) overlay UI on the top (~header) and
// bottom (~caption/reply/buttons) of a post. Scale a 1080x1920 card into this
// safe band so its masthead and footer stay clear. The cream frame matches the
// card background, so the margins read as intentional padding.
const SAFE_TOP = 230;
const SAFE_BOTTOM = 410;
const SCALE = (1920 - SAFE_TOP - SAFE_BOTTOM) / 1920;

export function ShareSafeFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        background: "#faf9f6",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: SAFE_TOP,
          left: "50%",
          transform: `translateX(-50%) scale(${SCALE})`,
          transformOrigin: "top center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
