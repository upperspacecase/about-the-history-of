const STEPS = [
  {
    n: "1",
    title: "History doesn’t repeat but it does rhyme.",
    body: "Every crisis has a precedent. The precedent usually hints at how this one ends.",
  },
  {
    n: "2",
    title: "Remember, there is no finish line.",
    body: "Every era thinks it’s the last act. None has been.",
  },
  {
    n: "3",
    title: "Find signal in the noise.",
    body: "Headlines describe. History explains.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="max-w-6xl mx-auto px-6 py-10">
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
