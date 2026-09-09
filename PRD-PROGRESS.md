# PRD v2 implementation progress

Source PRD: /Users/taypattison/Downloads/The-Long-View-PRD.md (v2, 2026-09-09).
Branch: `prd-v2` (cut from origin/main). This file is the loop's working
state, updated every iteration so a fresh context can resume. Slim before merge.

## Key discovery (iter 2)

origin/main already carried a v1 automated-briefing implementation (commits
62eb0cc/321e/5396070, merged from another Claude session): zod structured
outputs on claude-opus-5, snippet-based evidence packages, confidence
computation from observables, banned-language + headline validation, critic
pass, role-based (shift/pattern/noise) 3-story briefing in `briefings/{date}`,
and a paywall at GBP 200/yr. The PRD §3 change map was written against THIS
code. My first branch (`prd-v2-briefing`, kept for reference, pushed) was cut
from a stale local main; its Stage-1 modules were re-merged into main's
architecture on `prd-v2`.

## Blockers for Tay (report at the end; notified via push already)

- **Anthropic API credits exhausted** (org 0f47a9c6…, workspace wrkspc_016bk…).
  Local + Actions keys both 400 with "credit balance too low". Tomorrow's
  12:00 UTC Daily Reels run will fail. Live pipeline testing blocked until
  topped up. The 1Password "Anthropic API - The Long View" key is valid;
  `.env.local` holds a stale/invalid key (Tay must update it herself).
- Existing paying subscribers: PRD §14 transition decision before the paywall
  is removed in production.

## Architecture decisions (made once, don't relitigate)

- Model: claude-opus-5 everywhere (matches main's v1).
- Generation flow per story (story-generate.ts): evidence package (REAL
  retrieval now: SSRF-guarded article fetch, access modes full/excerpt/
  snippet, wire-copy origin groups) -> researchBackground() (research.ts:
  web_search server tool, pause_turn loop, only URLs actually received
  survive; findings citing unverified sources stripped in code) -> analysis
  (messages.parse + zod; new fields whatChanged/background/uncertainties/
  whatToWatch; timeline/patterns/furtherReading optional; precedent nullable)
  -> enforceHistoricalGrounding() (code gate: timeline/reading links must be
  held URLs; precedent+patterns dropped when no research) -> headline
  candidates (plain editorial headline, paraphrase-of-source now allowed,
  identical copy banned) -> validateStory (background/uncertainties required,
  precedent optional) -> critic (research notes are the only permitted source
  of historical specifics; qualification-lost + weak-uncertainties codes).
- Confidence uses independentOriginCount (EVD 03), not publisher count.
- Headline-only generation REMOVED: history-generate.ts deleted, /api/history
  POST returns 410, GET is read-only legacy with storySlug mapping.
- StoryDoc keeps legacy field names (truthHeadline = editorial headline) for
  stored-document compatibility; new PRD fields added to HistoryResponse.
- Firestore (new, Stage 2): `stories`, `storyVersions`, `editions`,
  `corrections`, `pipelineRuns`, `deliveries`, `errorReports`. Existing
  `histories`, `briefings`, `posts`, `subscribers`, `users` untouched.
- Search: `searchTokens` array-contains + pagination on stories.
- Homepage feature flag: env `LEGACY_HOMEPAGE=1` keeps old feed page.
- NO billing changes; paywall removed from reading journey in Stage 3.
- Edition: UTC, id YYYY-MM-DD; statuses published|quiet|partial|delayed|
  unavailable.

## Stage checklist

### Stage 1 — evidence + publication rules [DONE iter 2, commit pending]
- [x] evidence.ts: retrieval + access modes + origin groups (merged into main's shape)
- [x] research.ts: grounded background research w/ web_search + URL verification
- [x] research-prompt.ts: PRD-aligned analysis/headline/critic prompts
- [x] story-generate.ts: research stage + grounding gate + new fields + optional history
- [x] story-validate.ts: precedent optional; background/uncertainties required
- [x] headline-validate.ts: plain restatement allowed, identical copy banned
- [x] feeds.ts: fetchAllReports (24h window, 200 cap, coverage stats)
- [x] Headline-only path removed (history-generate deleted; /api/history POST 410)
- [x] scripts/test-story.ts rewritten; tsc clean
- [ ] LIVE TEST BLOCKED on API credits (run `npx tsx scripts/test-story.ts`
      with a funded key, or `gh workflow run test-story.yml`)

### Stage 2 — ongoing stories [DONE iter 2, commit df3d254]
- [x] story-store.ts: matching (conservative, entity+overlap, 45-day window),
      immutable storyVersions (`${storyId}-v${n}`), publishEdition (refuses
      silent re-publication; verifies referenced versions exist), corrections
      + retraction, legacy histories mapping (histories/{id}.storyId)
- [x] Analysis reports entities/topics + materialChange/changeReason;
      generateStory returns no-material-change as a first-class outcome
- [ ] pipelineRuns records land in Stage 4 (publish-edition script)

### Stage 3 — public reading experience [DONE iter 3, commit fe11996]
- [x] / = latest edition (server component, force-dynamic; quiet/partial/
      delayed/unavailable states; caught-up ending; email invite);
      LEGACY_HOMEPAGE=1 renders src/components/legacy-home.tsx
- [x] /briefing/[date], /story/[slug]?version=, /archive (stories+editions
      tabs, token search w/ pagination), /how-it-works, /account
- [x] /api/briefing (latest/date/list), /api/stories, /api/story/[id],
      /api/corrections/report (create-only per-hour dedupe)
- [x] §10 copy; paywall out of reading journey (PaymentPopup only reachable
      via legacy flag); /history legacy-labelled + redirects to mapped story;
      /preview redirects home; layout metadata per §10
- [x] Numeric significance/dots absent from new reader UI (legacy /history
      page still shows SignificanceLabel — archived format, acceptable)
- [x] npm run build green; lint: only 7 pre-existing problems (remotion demo
      + legacy-home)

### Stage 4 — distribution + ops
- [ ] scripts/publish-edition.ts replacing daily-post story selection
      (ingest fetchAllReports -> cluster -> story resolution -> evidence ->
      generate -> select (no roles quota) -> publish atomically -> email ->
      reels); dry-run isolation; run records; workflow update
- [ ] digest/resend: email IS the briefing; delivery ledger idempotency; §10 templates
- [ ] caption.ts/Reel: published versions only, no strikethrough language
- [ ] admin page: run outcomes, withheld reasons, deliveries

### Stage 5 — verification + ship
- [ ] tsc/lint/build clean; §16 acceptance sweep recorded here
- [ ] Merge prd-v2 -> main, push (Tay authorized ship-to-main)
- [ ] Final report: credits blocker, subscriber transition decision, stale
      .env.local key, PRD deviations

## Iteration log
- Iter 1: repo inspected (stale local main), Stage 1 built on prd-v2-briefing.
- Iter 2: discovered v1 briefing on origin/main; re-merged Stage 1 into
  main's architecture on prd-v2; credits blocker found + Tay notified.
  Stage 2 store built + committed (df3d254). NEXT: Stage 3 public reading
  experience (homepage edition + story pages + archive + copy pack §10,
  paywall out of the reading journey).
