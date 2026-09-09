# PRD v2 implementation progress

Source PRD: /Users/taypattison/Downloads/The-Long-View-PRD.md (v2, 2026-09-09).
Branch: `prd-v2-briefing`. This file is the loop's working state — updated every
iteration so a fresh context can resume. Delete or slim before merge.

## Architecture decisions (made once, don't relitigate)

- **Model:** `claude-opus-5` for drafting and critic (claude-api skill default;
  quality is the product). Drafting call uses the `web_search_20260209` server
  tool for historical grounding (EVD 06); manual loop handles `pause_turn`.
- **Structured output:** prompt-for-JSON + hard code-level validation in
  `story-validate.ts` (no zod — not in package.json; deep evidence-ref checks
  are needed in code anyway). One corrective regeneration, then withhold (OPS 03).
- **Evidence retrieval:** dependency-free server fetch of article URLs from the
  RSS reports (`src/lib/evidence.ts`): SSRF-guarded (https only, public hosts,
  redirect + size + time bounds), naive readability (paragraph extraction),
  access modes full|excerpt|snippet, wire-copy origin grouping via content
  fingerprint. No paywall bypass — paywalled sources fall back to RSS snippet.
- **Firestore collections (new):** `stories`, `storyVersions`, `editions`,
  `sourceReports`, `evidence`, `corrections`, `pipelineRuns`, `deliveries`,
  `errorReports`. Legacy `histories`, `posts`, `subscribers`, `users` untouched.
- **Search:** `searchTokens` array on story docs + Firestore `array-contains`
  + pagination. Documented limitation; no external index dependency.
- **Homepage feature flag:** env `LEGACY_HOMEPAGE=1` renders the old feed page
  (kept as `src/components/legacy-home.tsx`); default renders editions (§17).
- **Public pages are server components** (PRD §13: published content must not
  depend on client auth). Interactive bits (archive search) stay client.
- **Billing:** NO changes to Stripe routes, webhook, or existing subscriber
  records. Paywall popup removed from reading journey; sign-in retained for
  account status. Customer transition = Tay's decision, flagged at the end.
- **Reels/email:** consume published story versions only; truth-headline
  strikethrough removed; captions per §10 social copy.
- Edition timezone: UTC, one edition/day, id = YYYY-MM-DD (PRD §12 proposal).

## Stage checklist (PRD §17)

### Stage 1 — evidence + publication rules
- [ ] src/lib/story-types.ts (contracts: §12 records)
- [ ] src/lib/evidence.ts (retrieval, access modes, origin groups, SSRF guards)
- [ ] src/lib/research-prompt.ts v2 (grounded drafting prompt, §10 field labels)
- [ ] src/lib/story-generate.ts (draft w/ web_search + critic pass)
- [ ] src/lib/story-validate.ts (gates: schema, evidence refs, fail-closed)
- [ ] scripts/test-story.ts (single-headline dry test, no Firestore writes)
- [ ] Verified: one real cluster drafts, validates, withholds correctly

### Stage 2 — ongoing stories
- [ ] src/lib/story-store.ts (story identity, matching, versions, editions)
- [ ] Material change detection (compare vs last published version)
- [ ] Correction records + retraction semantics
- [ ] Legacy /history mapping (labelled legacy page, AT 19)

### Stage 3 — public reading experience
- [ ] New homepage (finite edition, states, ending) + feature flag
- [ ] /briefing/[date], /story/[slug] (+?version=), /archive, /how-it-works
- [ ] /api/briefing, /api/stories, /api/story/[id], /api/corrections/report
- [ ] Copy pack §10; paywall removed from reading journey; preview retired
- [ ] Metadata/OG updates in layout.tsx

### Stage 4 — distribution + ops
- [ ] scripts/publish-edition.ts (staged: ingest→cluster→resolve→evidence→
      draft→gate→select→publish atomically→email→reels; run records; dry run)
- [ ] Email = the briefing itself; delivery ledger idempotency; §10 templates
- [ ] Reels from published versions; caption rewrite; no quota posting
- [ ] Admin page: run outcomes, withheld reasons, delivery results
- [ ] GitHub workflow update (daily-post → publish-edition)

### Stage 5 — verification
- [ ] npx tsc --noEmit clean; npm run lint clean; npm run build clean
- [ ] Pipeline dry run end-to-end locally
- [ ] §16 acceptance checklist swept, outcomes recorded here
- [ ] Commits per stage; final report to Tay (incl. open decisions: existing
      subscribers, retrieval budget, deploy)

## Iteration log
- Iter 1 (2026-09-09): Repo inspected, Next docs + claude-api skill loaded,
  branch created, decisions recorded. Starting Stage 1.
