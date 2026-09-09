# PRD v2 implementation record

Source PRD: The Long View PRD v2 (2026-09-09). Implemented 2026-09-09/10 on
branch `prd-v2`, shipped to main. This file is the implementation record and
operator handoff.

## What must happen before the first real edition

1. **Anthropic API credits** (org 0f47a9c6…): local and Actions keys both
   return "credit balance too low". The daily pipeline cannot generate until
   billing is topped up. The 1Password item "Anthropic API - The Long View"
   holds a valid key; `.env.local` holds a stale one (update it by hand).
2. After credits: run `gh workflow run test-story.yml` (single story through
   research/analysis/critic), then `gh workflow run daily-post.yml -f
   dry_run=true` (full pipeline, publishes nothing), then let the 07:00 UTC
   schedule publish the first edition.
3. **Existing paying subscribers** (PRD §14): the paywall is out of the
   reading journey; billing, Stripe routes, webhooks and entitlements are
   untouched, and /account shows the real plan. Decide their treatment
   (keep billing, credit, refund) and communicate it — nothing here changed
   or authorised billing.

## Deviations from the PRD (deliberate, flagged)

- **EVD 05 claim-level ledger:** claims are checked semantically by the
  critic and historical links are verified in code, but per-claim evidence
  records are not stored as separate documents. The full evidence inputs
  (passages with access modes, research sources) are stored on each version.
- **Merges/splits of story identities (§8):** conservative matching means
  low-confidence matches stay separate stories (PRD-required default);
  operator-driven merge/split tooling is not built.
- **OPS 07 cost records:** runs record model + stage outcomes + decision
  counts, not per-call token costs.
- **§15 measurement:** analytics events beyond the existing /api/track
  clicks (edition_viewed etc.) are not instrumented; the reader pilot is a
  human activity.
- **Corrections with replacement text** require a hand-authored corrected
  doc; `scripts/correct-story.ts` covers public-note corrections and
  retractions, which is the realistic solo-operator workflow.

## Acceptance sweep (§16), code-level

Live generation was blocked by the credit balance, so AT 02/06/07/09 are
verified at the gate-logic level, not with live model output.

- AT 01 public reading, no popup: PASS (all reading routes public; popup only behind LEGACY_HOMEPAGE=1)
- AT 02 one story identity per event: clustering + matching + no-material-change path in place
- AT 03 development links predecessor: PASS (publishStoryVersion + "Since our last update" + previous-version link)
- AT 04 first coverage says "What happened": PASS
- AT 05 wire copies ≠ independent origins: PASS (content fingerprints; snippet-only sources count once per publisher)
- AT 06 inaccessible source → excerpt limits/withhold: retrieval fallback + prompt + critic
- AT 07 unsupported history removed: PASS (enforceHistoricalGrounding, URL allowlist in code)
- AT 08 no analogy is valid: PASS (nullable precedent, validators allow empty sections)
- AT 09 weak claim → no confident headline: critic (qualification-lost) + headline validation
- AT 10 two cards, no quota: PASS (no minimum, roles removed from selection)
- AT 11 feeds fail → unavailable, never quiet: PASS
- AT 12 quiet edition scoped message: PASS
- AT 13 corrections: notices + records + open correctionTasks for distributed posts: PASS (amendment itself is manual)
- AT 14 re-run safety: PASS (edition existence check, lock, delivery ledger)
- AT 15 IG failure is a channel error: PASS (isolated stage; dashboard shows stages)
- AT 16 dry run publishes nothing: PASS (no story/edition/email/post/ledger writes)
- AT 17 archive search + pagination + date filters: PASS
- AT 18 hostile source text inert: untrusted-data guards in prompts; SSRF-bounded retrieval
- AT 19 legacy /history: PASS (read-only, labelled, redirects to mapped story)
- AT 20 provider error ≠ sent: PASS (resend throws on error; ledger failed)
- AT 21 qualifications survive Reels: PASS (uncertainty on card + caption)
- AT 22 clear ending, no feed: PASS
- AT 23 a11y basics: semantic headings, labelled fields, no colour-only signals; not formally audited
- AT 24 existing customer sees accurate plan: PASS (/account, no billing changes)

## Architecture (for future sessions)

- Generation (src/lib/story-generate.ts): evidence package (real retrieval,
  SSRF-guarded, access modes, origin groups) → researchBackground()
  (web_search server tool on claude-opus-5; only URLs actually received
  survive) → analysis (messages.parse + zod; optional history sections,
  nullable precedent, materialChange decision) → enforceHistoricalGrounding
  (code URL gate) → headline candidates + deterministic validation → critic.
  Two attempts, then withheld. Internal significance/confidence never render
  as numbers in the reader UI.
- Store (story-store.ts): stories / storyVersions (immutable,
  `${storyId}-v${n}`) / editions (id = UTC date; statuses published, quiet,
  partial, delayed, unavailable) / corrections / correctionTasks /
  pipelineRuns / deliveries / errorReports / locks. Legacy `histories` is
  read-only, mapped via histories/{id}.storyId.
- Pipeline (scripts/publish-edition.ts): the §13 staged flow; email and
  reels are isolated channels with an idempotent ledger; ops report to
  OPS_EMAIL; red CI only when the edition itself fails.
- Web: / (latest edition), /briefing/[date], /story/[slug]?version=,
  /archive, /how-it-works, /account, /admin (+ pipeline panel). Public APIs:
  /api/briefing, /api/stories, /api/story/[id], /api/corrections/report.
  Rollback: LEGACY_HOMEPAGE=1 renders the old feed page.
