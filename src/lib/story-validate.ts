// Publication gate (PRD §7, EVD 05-10). Pure code checks on a draft plus the
// critic verdicts. Fails closed: anything that cannot be established is
// removed or withheld, never published with a lowered bar.

import type { EvidencePackage } from "./evidence";
import type { DraftResult, CriticVerdict } from "./story-generate";
import type { Claim, ClaimSection, StoryVersionDraft } from "./story-types";

export type GateResult =
  | { ok: true; draft: StoryVersionDraft; notes: string[] }
  | { ok: false; reason: string; regenerable: boolean; notes: string[] };

const CLAIM_TYPES = new Set([
  "reported-fact",
  "historical-fact",
  "interpretation",
  "unresolved-claim",
]);
const CLAIM_SECTIONS = new Set([
  "whatChanged",
  "whyItMatters",
  "background",
  "timeline",
  "comparison",
]);

function isNonEmptyString(v: unknown, max = 2000): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
}

export function validateStructure(
  draft: DraftResult,
  evidence: EvidencePackage,
  searchedUrls: Set<string>
): { errors: string[]; claims: Claim[] } {
  const errors: string[] = [];

  if (draft.decision !== "publish") {
    return { errors: ["decision is not publish"], claims: [] };
  }
  if (!isNonEmptyString(draft.editorialHeadline, 140))
    errors.push("editorialHeadline missing or too long");
  if (!isNonEmptyString(draft.whatChanged)) errors.push("whatChanged missing");
  if (!isNonEmptyString(draft.whyItMatters)) errors.push("whyItMatters missing");
  if (!isNonEmptyString(draft.background)) errors.push("background missing");
  if (!Array.isArray(draft.uncertainties))
    errors.push("uncertainties must be an array");
  if (!Array.isArray(draft.entities) || draft.entities.length === 0)
    errors.push("entities missing");
  if (!Array.isArray(draft.topics) || draft.topics.length === 0)
    errors.push("topics missing");

  // Valid evidence ids: package items plus web sources whose URLs were
  // actually received from search (never links from model memory — EVD 06).
  const validIds = new Set(evidence.items.map((i) => i.id));
  for (const w of draft.webSources ?? []) {
    if (!w.id || !w.url) continue;
    if (searchedUrls.has(w.url)) {
      validIds.add(w.id);
    } else {
      errors.push(`webSource ${w.id} cites a URL not received from search: ${w.url}`);
    }
  }

  const claims: Claim[] = [];
  if (!Array.isArray(draft.claims) || draft.claims.length === 0) {
    errors.push("claims missing");
  } else {
    for (const c of draft.claims) {
      if (!isNonEmptyString(c.text, 600)) {
        errors.push("claim with empty text");
        continue;
      }
      if (!CLAIM_TYPES.has(c.type)) errors.push(`claim has bad type: ${c.type}`);
      const section = (c as { section?: string }).section;
      if (!section || !CLAIM_SECTIONS.has(section))
        errors.push(`claim missing section: ${c.text.slice(0, 60)}`);
      if (!Array.isArray(c.evidenceIds) || c.evidenceIds.length === 0) {
        errors.push(`claim has no evidence: ${c.text.slice(0, 60)}`);
      } else {
        for (const id of c.evidenceIds) {
          if (!validIds.has(id))
            errors.push(`claim cites unknown evidence ${id}: ${c.text.slice(0, 60)}`);
        }
      }
      claims.push({
        text: c.text,
        type: c.type as Claim["type"],
        section: section as ClaimSection,
        evidenceIds: c.evidenceIds ?? [],
        essential: c.essential === true,
      });
    }
    if (!claims.some((c) => c.essential))
      errors.push("no essential claim identified");
  }

  for (const t of draft.timeline ?? []) {
    if (!isNonEmptyString(t.date, 40) || !isNonEmptyString(t.text, 600)) {
      errors.push("timeline entry missing date or text");
      continue;
    }
    if (!Array.isArray(t.evidenceIds) || t.evidenceIds.length === 0) {
      errors.push(`timeline entry has no evidence: ${t.text.slice(0, 60)}`);
    } else {
      for (const id of t.evidenceIds) {
        if (!validIds.has(id)) errors.push(`timeline cites unknown evidence ${id}`);
      }
    }
  }

  if (draft.comparison) {
    if (
      !isNonEmptyString(draft.comparison.text) ||
      !isNonEmptyString(draft.comparison.limitation)
    ) {
      errors.push("comparison missing text or limitation");
    }
    const ids = draft.comparison.evidenceIds ?? [];
    if (ids.length === 0) errors.push("comparison has no evidence");
    for (const id of ids) {
      if (!validIds.has(id)) errors.push(`comparison cites unknown evidence ${id}`);
    }
  }

  return { errors, claims };
}

// Match critic verdicts to claims by text prefix (the critic echoes the
// first 80 chars of each claim).
function unsupportedClaims(claims: Claim[], critic: CriticVerdict): Claim[] {
  const out: Claim[] = [];
  for (const verdict of critic.verdicts) {
    if (verdict.supported) continue;
    const prefix = verdict.claim.trim().slice(0, 60).toLowerCase();
    const match = claims.find((c) =>
      c.text.trim().toLowerCase().startsWith(prefix)
    );
    if (match) out.push(match);
  }
  return out;
}

export function applyGate(
  draft: DraftResult,
  evidence: EvidencePackage,
  searchedUrls: Set<string>,
  critic: CriticVerdict
): GateResult {
  const notes: string[] = [];
  const { errors, claims } = validateStructure(draft, evidence, searchedUrls);
  if (errors.length > 0) {
    return {
      ok: false,
      reason: `structural: ${errors.slice(0, 5).join("; ")}`,
      regenerable: true,
      notes,
    };
  }

  const unsupported = unsupportedClaims(claims, critic);
  if (critic.unsupportedEssential || unsupported.some((c) => c.essential)) {
    return {
      ok: false,
      reason: `essential claim unsupported: ${critic.notes}`,
      regenerable: true,
      notes,
    };
  }

  // Remove unsupported nonessential material (EVD 09). Timeline and
  // comparison sections can be dropped surgically; unsupported prose claims
  // outside them cannot be excised in code, so they force a regeneration.
  const droppableSections = new Set<ClaimSection>(["timeline", "comparison"]);
  const proseUnsupported = unsupported.filter(
    (c) => !droppableSections.has(c.section)
  );
  if (proseUnsupported.length > 0) {
    return {
      ok: false,
      reason: `unsupported prose claims: ${proseUnsupported
        .map((c) => c.text.slice(0, 60))
        .join(" | ")}`,
      regenerable: true,
      notes,
    };
  }

  let timeline = draft.timeline ?? [];
  let comparison = draft.comparison;
  const badTimeline = unsupported.some((c) => c.section === "timeline");
  const badComparison = unsupported.some((c) => c.section === "comparison");
  if (badTimeline) {
    timeline = [];
    notes.push("timeline dropped: unsupported entries");
  }
  if (badComparison) {
    comparison = undefined;
    notes.push("comparison dropped: unsupported");
  }
  const keptClaims = claims.filter(
    (c) =>
      !(badTimeline && c.section === "timeline") &&
      !(badComparison && c.section === "comparison")
  );

  // Single-origin labelling (EVD 04): when the package has one reporting
  // origin, attribute it whether or not the model remembered to.
  let singleOrigin = draft.singleOrigin;
  if (evidence.independentOrigins < 2 && !singleOrigin) {
    singleOrigin = evidence.reports[0]?.report.publisher;
    notes.push(`singleOrigin set to ${singleOrigin}`);
  }
  if (evidence.independentOrigins >= 2) singleOrigin = undefined;

  const uncertainties = (draft.uncertainties ?? []).filter((u) =>
    isNonEmptyString(u, 400)
  );

  return {
    ok: true,
    notes,
    draft: {
      editorialHeadline: draft.editorialHeadline!,
      whatChanged: draft.whatChanged!,
      whyItMatters: draft.whyItMatters!,
      background: draft.background!,
      uncertainties,
      whatToWatch: isNonEmptyString(draft.whatToWatch, 500)
        ? draft.whatToWatch
        : undefined,
      timeline: timeline.length > 0 ? timeline : undefined,
      comparison,
      claims: keptClaims,
      entities: draft.entities!.slice(0, 12),
      topics: draft.topics!.slice(0, 6).map((t) => t.toLowerCase()),
      singleOrigin,
    },
  };
}
