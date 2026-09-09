# The Long View

Understand the news. Get on with your day.

A short daily briefing on what changed, with the background to make sense of
it. A fully automated pipeline retrieves the reporting behind each selected
development, researches the history with verified sources, writes the story,
checks every material claim against the evidence, and publishes a finite
edition of at most five cards — with quiet days reported honestly and
corrections recorded visibly. There is no human editorial queue; stories
that fail the checks are withheld, never published to fill a quota.

## Demo

https://github.com/upperspacecase/about-the-history-of/raw/main/public/demo.mp4

> The demo video is a Remotion-rendered recreation of the reading flow (not a
> recording of the live site). Source: [`remotion/`](./remotion).

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Reading published
editions needs the Firebase admin credentials; generation additionally needs
`ANTHROPIC_API_KEY`.

## The daily pipeline

```bash
DRY_RUN=1 npx tsx scripts/publish-edition.ts   # generate + render, publish nothing
npx tsx scripts/test-story.ts                  # run one live cluster through the gates
npx tsx scripts/correct-story.ts <slug> --note "…"   # record a correction
```

In production the pipeline runs from `.github/workflows/daily-post.yml`
(07:00 UTC): ingest feeds, cluster reports, resolve ongoing stories,
retrieve evidence, generate and gate each story, publish the edition
atomically, then send the briefing email and reels as isolated channels.

## Structure

- `src/app/page.tsx` — the latest published edition
- `src/app/story/[slug]/page.tsx` — story pages with versions, sources and corrections
- `src/app/archive/page.tsx` — story search and the editions index
- `src/lib/evidence.ts` — bounded article retrieval and origin grouping
- `src/lib/research.ts` — web-search background research with verified URLs
- `src/lib/story-generate.ts` — analysis, headline and critic gates
- `src/lib/story-store.ts` — canonical stories, immutable versions, editions
- `scripts/publish-edition.ts` — the daily pipeline
- `remotion/` — Reel compositions for Instagram distribution
