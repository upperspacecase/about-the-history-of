# The Long View: Offering

Decided 2026-08-18. Supersedes the 2026-06-03 value-ladder plan.

The Long View is a fully automated daily news briefing for time-poor
professionals who want to understand what matters without following the news
all day. There is no human editorial-review queue. Reliability comes from
source grounding, multiple automated validation stages, transparent
confidence scores, and the system's ability to withhold weak analysis.

## The Five Ones

* One market: high-income American professionals who already pay for serious news.
* One problem: they cannot tell which events genuinely matter without consuming hours of repetitive, sensational coverage.
* One offer: three important stories each morning, placed in historical context and ranked by significance.
* One primary product: email, with the website acting as the archive and subscription interface.
* One year: build specifically for this audience before expanding to students, general history enthusiasts, investors, or enterprise customers.

## Target customer

* Based in the United States, roughly 35 to 64 years old.
* A director, VP, founder, partner, consultant, or senior independent professional.
* Earning enough that saving 20 to 30 minutes a day is financially meaningful.
* Already paying for at least one of: the New York Times, Wall Street Journal, Financial Times, The Economist, or a premium Substack.
* Interested in economics, politics, technology, geopolitics, and institutional change.
* Feels responsible for staying informed but dislikes outrage, repetition, and breaking-news theatre.
* Uses The Long View for orientation and understanding, not trading, legal advice, or real-time operational decisions.

Job to be done: "Before I start work, tell me what happened, how unusual it
is, and whether it actually changes anything, without making me consume a
day's panic."

## Product promise

Know what changed. Ignore what didn't.

The briefing takes less than five minutes to read and leaves the customer
calmer, clearer, and appropriately informed. The customer is paying for
prioritisation, time saved, protection from media overreaction, a defensible
sense of scale, and the confidence to ignore stories that do not materially
change anything. Not primarily for historical facts.

## Offer and pricing

One paid plan:

**The Daily Long View**, with a 14-day free trial. Target price is $99 per
year; the site displays £200/year until the $99 price is created in Stripe
(see below). No free and
paid tiers, and no GBP 200 / GBP 300 ladder while the product is entirely
automated.

The subscription includes:

* One morning email containing up to three stories.
* A provisional significance judgment for every story.
* Historical precedent and the crucial difference.
* A clear explanation of what would change the judgment.
* A searchable web archive.
* Automatic updates when important evidence changes.

Stripe env var: `STRIPE_PRICE_ANNUAL` (the $99/yr price). `STRIPE_PRICE_YEARLY`
is read as a fallback for existing deployments. The paywall copy must always
match the price the checkout actually charges: it currently shows £200/year
(the live `STRIPE_PRICE_YEARLY` price) and switches to $99 when the new
price is live.

## Daily briefing structure

Three card categories (not headline templates):

1. The shift: the event most likely to create durable change.
2. The pattern: an important development following a recognisable historical mechanism.
3. The noise check: a heavily covered event that currently changes less than the coverage implies.

The system may publish fewer than three stories when the evidence is
insufficient. An unusually quiet day is a valid and useful conclusion, and
subscribers get a quiet-day note saying so.

## Required story fields

Original source headline; original publisher and URL; Long View verdict
headline; story category; event classification (Routine, Recurring,
Accelerating, Structural, Era-defining); provisional significance score;
score breakdown; confidence level; why it matters; closest historical
precedent; crucial difference from that precedent; what would raise or lower
the score; supporting sources; generation timestamp; last-updated timestamp.

## Headline system

The verdict is generated first; the headline is written afterward, from the
verdict. Requirements: 3 to 12 words, at most 80 characters, sentence case,
one clear claim, a judgment absent from the source headline, ordinary
language, willing to call an event routine or overcovered, only claims
supported by the sources, no em dashes, and the historical comparison stays
out of the headline unless a named precedent is essential.

Banned language (rejected unless the story names a specific and directly
relevant precedent): echoes, after decades of, century-old, marks, signals,
highlights, reflects, underscores, reshapes, familiar pattern, as old as,
one for the timeline, more rhyme than rupture. The list expands
automatically: words and phrases becoming overused across the last 50
published headlines are banned for new candidates
(`src/lib/banned-language.ts`).

The final headline test: if a headline could sit above fifty unrelated
stories, it has failed.

## Significance scoring

Five dimensions, each 0 to 2 points: scale, durability, institutional
change, novelty, spillovers. The components must add up to the displayed
score. Labels: 0-2 limited wider significance; 3-4 notable; 5-6
consequential; 7-8 structural shift; 9-10 era-defining. The interface always
describes the score as provisional, and the verbal label is more prominent
than the number. Human tragedy is never confused with historical
significance.

## Production pipeline (fully automated)

1. Discover and cluster events from the approved source list; measure
   coverage volume without treating it as significance
   (`src/lib/select-top-stories.ts`).
2. Build an evidence package per candidate; reject candidates resting on a
   single weak source (`src/lib/evidence.ts`).
3. Analyse significance: what changed, five-part score, classification,
   precedent, crucial difference, what would change the score
   (`src/lib/story-generate.ts`, analysis stage).
4. Generate five headline candidates with meaningfully different structures,
   fed the evidence, the analysis, the previous 50 headlines, the overused
   language, and the banned list.
5. Validate candidates deterministically with failure codes
   (`src/lib/headline-validate.ts`); the critic never rewrites.
6. Validate the complete story: deterministic checks
   (`src/lib/story-validate.ts`) plus an automated critic. A story failing
   twice is withheld automatically; it never goes to a human queue and is
   never published to fill the quota.
7. Publish and monitor: regenerations record visible revision entries with
   the previous and current score; material claims are never silently
   altered.

Confidence is calculated from observable inputs (`src/lib/confidence.ts`):
number and quality of independent sources, availability of a primary source,
agreement between sources, whether the event is still rapidly developing,
strength of evidence for the historical comparison, and the number of
unsupported claims removed during validation. Low-confidence stories are
withheld from the briefing; the interactive reader path may publish them
with the uncertainty shown prominently.

## Landing-page positioning

Headline: "Not everything breaking is important." Supporting copy: "The Long
View ranks three stories each morning by historical significance, so you can
understand what changed and ignore what didn't." and "A five-minute daily
briefing for people who want to stay informed without living in the news."
Primary CTA: "Start your 14-day trial" with the live price. Never promise "the truth
beneath the surface"; the product promises a transparent, sourced judgment.

## Transparency

Shown on every surface: "The Long View is produced by an automated analysis
system using linked reporting and historical sources. Every story passes
automated sourcing, consistency, similarity, and confidence checks. Analysis
remains provisional and may be updated as evidence changes." Never imply a
human editor reviewed the work.

## Acceptance criteria

* The complete workflow runs without a human editorial step.
* Every claim is linked to supporting evidence.
* Every score contains five valid component scores that sum to the total.
* Every comparison names a specific precedent.
* No published headline contains a banned cliche.
* No headline construction appears more than twice within the previous 30 stories.
* Every headline adds a judgment absent from the source headline.
* Failed stories are automatically withheld.
* Material updates create visible revision records.
* The daily email can legitimately contain one, two, or three stories.
* The full briefing takes less than five minutes to read.
