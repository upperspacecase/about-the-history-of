interface Props {
  score: number;
  reason?: string;
  size?: "sm" | "md" | "lg";
}

export function SignificanceDots({ score, reason, size = "sm" }: Props) {
  const dot =
    size === "lg" ? "h-2.5 w-2.5" : size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Historical significance: ${score} of 10`}
      title={reason ? `${score}/10 — ${reason}` : `${score}/10`}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={`${dot} rounded-full ${
            i < score ? "bg-accent" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}
