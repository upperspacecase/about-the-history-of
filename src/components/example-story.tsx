const KEY_MOMENTS = [
  {
    year: "2015",
    title: "OpenAI Founded as Nonprofit",
    body: "Elon Musk, Sam Altman, and others created OpenAI as a nonprofit to develop safe artificial general intelligence for humanity’s benefit.",
  },
  {
    year: "2018",
    title: "Musk Departs the OpenAI Board",
    body: "Tensions emerge over pace and direction. Musk leaves the board, warning of potential conflicts ahead.",
  },
  {
    year: "2019",
    title: "OpenAI Creates a Capped-Profit Arm",
    body: "OpenAI LP is formed to attract capital while preserving the nonprofit’s mission and limiting investor returns.",
  },
  {
    year: "2022",
    title: "ChatGPT Goes Public",
    body: "ChatGPT reaches 100M users in months, sparking a global AI race and unprecedented investor interest.",
  },
  {
    year: "2023",
    title: "Altman Fired and Reinstated in Five Days",
    body: "A board power struggle exposes deep governance tensions inside the organization.",
  },
  {
    year: "2024",
    title: "Musk Sues OpenAI and Altman",
    body: "Musk alleges OpenAI abandoned its founding mission for profit, suing to force a return to its original purpose.",
  },
];

function SignificanceDotsDisplay({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={
            i < score
              ? "w-2 h-2 rounded-full bg-accent"
              : "w-2 h-2 rounded-full bg-border"
          }
          aria-hidden
        />
      ))}
      <span className="ml-2 text-xs font-medium text-muted">{score}/10</span>
    </div>
  );
}

export function ExampleStory() {
  const originalTitle =
    "Musk Lawyer’s Question for Sam Altman on the Stand: Are You Trustworthy?";
  const truthHeadline =
    "Tech Billionaires Battle Over Who Controls AI Future—Old Silicon Valley Breakup Into Lawsuit";

  return (
    <article className="bg-card border border-border rounded-lg p-6 md:p-7 text-foreground">
      <p className="text-[11px] tracking-[0.18em] uppercase font-semibold text-accent mb-4">
        Today’s Long View
      </p>

      <div className="space-y-2">
        <h3
          className="text-xl md:text-2xl font-bold leading-[1.15] tracking-tight line-through text-muted decoration-muted/60"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {originalTitle}
        </h3>
        <h3
          className="text-xl md:text-2xl font-bold leading-[1.15] tracking-tight text-green-700 dark:text-green-500"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {truthHeadline}
        </h3>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">
          Historical Significance
        </span>
        <SignificanceDotsDisplay score={6} />
      </div>

      <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
        Reflects ongoing power struggle over AI governance between rival
        visions, but resembles past tech feuds more than a turning point.
      </p>

      <hr className="my-5 border-border" />

      <h4
        className="text-base font-bold mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        OpenAI Governance Dispute and AI Industry Control
      </h4>
      <p className="text-sm text-foreground/90 leading-relaxed">
        Elon Musk is suing Sam Altman over OpenAI’s transformation from
        nonprofit to profit—echoing decades of Silicon Valley power struggles
        over technology’s direction. This follows a pattern where founding
        idealists clash when billions of dollars enter the picture, from early
        internet disputes to social media control battles. The real fight is
        about who shapes AI’s future—and whether it serves humanity or
        shareholders.
      </p>

      <hr className="my-5 border-border" />

      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted mb-4">
        Key Moments in History
      </p>

      <ol className="relative space-y-5">
        <span
          aria-hidden
          className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
        />
        {KEY_MOMENTS.map((m, idx) => (
          <li key={m.year} className="relative pl-7">
            <span
              aria-hidden
              className={
                idx === 0
                  ? "absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-accent bg-card"
                  : "absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-border bg-card"
              }
            />
            <p className="text-xs font-bold text-accent mb-0.5">{m.year}</p>
            <h5
              className="text-sm font-bold mb-0.5"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {m.title}
            </h5>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {m.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-md border border-accent/40 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="shrink-0 mt-0.5 text-accent"
          >
            <path
              d="M12 2l2.39 6.95H22l-6 4.36L18.18 22 12 17.77 5.82 22 8 13.31 2 8.95h7.61z"
              fill="currentColor"
            />
          </svg>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent mb-1">
              Why This Matters Now
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">
              This lawsuit isn’t just billionaire drama—it’s a public fight
              over who controls AI technology and whether public-benefit
              promises mean anything once billions flow in. History shows that
              whoever controls platform technologies shapes society for
              decades, from search engines to social media. The Musk-Altman
              battle is really asking: will AI development serve humanity’s
              broad benefit, or will it follow social media’s path toward
              extractive, monopoly-driven models? The answer will define the
              next technological era.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
