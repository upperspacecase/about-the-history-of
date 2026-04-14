# About the History of...

Today's headlines. The history behind them.

A newspaper-style front page that pulls current headlines from public RSS feeds (BBC, NPR, Al Jazeera, plus Reuters/AP via RSSHub when available). Click any headline and Claude writes the historical context behind it — a topic summary, a timeline of key moments, recurring patterns, and further reading.

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
