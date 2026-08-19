import { significanceLabel } from "@/lib/significance";

interface Props {
  score: number;
  confidence?: string;
  reason?: string;
  size?: "sm" | "lg";
}

/**
 * The significance readout. The verbal label leads; the number is secondary
 * and always described as provisional.
 */
export function SignificanceLabel({
  score,
  confidence,
  reason,
  size = "sm",
}: Props) {
  const label = significanceLabel(score);

  if (size === "sm") {
    return (
      <span
        className="text-[11px] font-medium text-accent whitespace-nowrap"
        title={
          reason
            ? `Provisional significance ${score}/10. ${reason}`
            : `Provisional significance ${score}/10`
        }
      >
        {label}
        <span className="text-muted font-normal"> · {score}/10</span>
      </span>
    );
  }

  return (
    <div>
      <p
        className="text-lg font-bold leading-tight"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {label}
      </p>
      <p className="text-xs text-muted mt-0.5">
        Provisional significance: {score}/10
        {confidence ? ` · ${confidence} confidence` : ""}
      </p>
    </div>
  );
}
