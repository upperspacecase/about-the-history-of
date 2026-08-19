# The Long View

Know what changed. Ignore what didn't.

A fully automated daily briefing that ranks up to three stories each morning by historical significance. Events are clustered from public RSS feeds (BBC, NYT, WSJ, Washington Post, CNN, Al Jazeera, NPR, TechCrunch), grounded in an evidence package, analysed and scored across five dimensions, given a verdict-first headline, and validated by deterministic checks plus an automated critic. Stories that fail validation are withheld; there is no human editorial queue. The website is the archive and subscription interface; email is the primary product. See [docs/OFFERING.md](./docs/OFFERING.md) for the full product definition.

## Demo

https://github.com/upperspacecase/about-the-history-of/raw/main/public/demo.mp4

> The demo video above is a Remotion-rendered recreation of the homepage and history page flow (not a recording of the live site). Source: [`remotion/`](./remotion).

## Running locally

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Remotion demo

```bash
npm run remotion:studio   # open the Remotion preview
npm run remotion:render   # render to public/demo.mp4
```

## Structure

- `src/app/page.tsx` — newspaper-style homepage
- `src/app/history/page.tsx` — history detail page
- `src/app/api/headlines/route.ts` — RSS feed aggregator
- `src/app/api/history/route.ts` — Claude-powered history generator
- `remotion/` — Remotion composition that demos the UI flow
