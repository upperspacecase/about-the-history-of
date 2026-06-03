# The Long View — Offering

Decided 2026-06-03. **Avatar:** founders, investors, operators. **Structure:** a value
ladder (not a single subscription). **Positioning:** "the briefing that keeps you ahead of
the narrative" — context, not chaos.

## The ladder

| Rung | Price | Role | Status |
|---|---|---|---|
| Free preview + daily email | £0 | Lead magnet — capture the email | **BUILT** (email capture on `/preview`) |
| Daily reader | £34/yr (£5/mo) | Front-end. Deliberately cheap; acquires customers, break-even is fine | LIVE |
| **Intelligence Briefing** | **£300/yr** | Back-end. Where the margin lives | TO BUILD |

The front-end (£34) is a customer-acquisition engine, not the business. The £300 back-end
is where the money is — so paid acquisition can break even up front and the ladder pays it back.

## The £300 tier — "The Long View Intelligence Briefing"

For founders / investors / operators who need to move on the news, not with it.

Value stack (what justifies £300):
- **Ask the Historian** — a Claude interface over the full histories corpus: "what's the
  precedent for X?" The hero feature; extends the existing `/api/history` generator.
- **Weekly operator briefing** — "what actually mattered this week," significance-ranked.
  Reuses the daily top-stories selection engine already built for the Reels pipeline.
- **Full searchable archive** — the precedent for any headline, ever. The data exists
  (`histories` collection + the date archive); this adds search.
- **Founding-member primer** — a history-of-the-present-moment intro for new members.

## Offer enhancers

- **Risk reversal:** 30-day "feel sharper or full refund — and keep the archive"
  (replaces the weak "Cancel anytime").
- **Scarcity:** founding-member pricing that steps up after the first N members
  (replaces the cosmetic "Save 43%").

## Build status

- **Done:** email capture on `/preview` → `subscribers` collection + Resend confirmation
  (the lead-magnet front of the ladder).
- **Next (gated on go — touches live Stripe + new features):** a £300/yr Stripe price + a
  third checkout tier; paywall repositioned to the ladder, founder/investor voice, the
  30-day guarantee, and real founding-member scarcity; then the three premium features
  (ask-the-historian, weekly briefing, searchable archive), shippable in that order.
