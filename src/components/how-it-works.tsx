const STEPS = [
  {
    n: "1",
    title: "We pick the headline",
    body: "Each day, we choose one major story shaping our world.",
  },
  {
    n: "2",
    title: "We trace the history",
    body: "We build a timeline of the key events, decisions, and turning points.",
  },
  {
    n: "3",
    title: "We give you the long view",
    body: "You get the context, the pattern, and what usually happens next.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted text-center mb-8">
          How it works
        </p>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-4">
              <span
                aria-hidden
                className="shrink-0 w-12 h-12 rounded bg-highlight border border-border flex items-center justify-center text-xl font-semibold"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {step.n}
              </span>
              <div>
                <h3
                  className="text-base font-semibold mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
