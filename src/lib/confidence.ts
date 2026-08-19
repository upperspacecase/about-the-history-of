import type { ConfidenceLevel } from "./history-types";

/**
 * Confidence is calculated from observable inputs, never from what the model
 * "feels". Each input maps to points; the total maps to a level.
 */
export interface ConfidenceInputs {
  /** Number of independent publishers reporting the event. */
  independentSourceCount: number;
  /** A primary document (filing, ruling, transcript, dataset) is available. */
  hasPrimarySource: boolean;
  /** How closely the sources agree on the facts. */
  sourceAgreement: "agree" | "minor-disagreement" | "major-disagreement";
  /** The event is still rapidly developing. */
  rapidlyDeveloping: boolean;
  /** Strength of the evidence for the historical comparison. */
  precedentStrength: "strong" | "moderate" | "weak";
  /** Unsupported or disputed claims removed during validation. */
  removedClaims: number;
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  points: number;
  reasons: string[];
}

export function computeConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  let points = 0;
  const reasons: string[] = [];

  if (inputs.independentSourceCount >= 4) {
    points += 3;
    reasons.push(`${inputs.independentSourceCount} independent sources`);
  } else if (inputs.independentSourceCount === 3) {
    points += 2;
    reasons.push("3 independent sources");
  } else if (inputs.independentSourceCount === 2) {
    points += 1;
    reasons.push("2 independent sources");
  } else {
    reasons.push("single source");
  }

  if (inputs.hasPrimarySource) {
    points += 2;
    reasons.push("primary source available");
  }

  if (inputs.sourceAgreement === "agree") {
    points += 2;
    reasons.push("sources agree");
  } else if (inputs.sourceAgreement === "minor-disagreement") {
    points += 1;
    reasons.push("minor disagreement between sources");
  } else {
    reasons.push("sources disagree on material facts");
  }

  if (inputs.rapidlyDeveloping) {
    points -= 2;
    reasons.push("still rapidly developing");
  }

  if (inputs.precedentStrength === "strong") {
    points += 1;
    reasons.push("well-evidenced precedent");
  } else if (inputs.precedentStrength === "weak") {
    points -= 1;
    reasons.push("weak evidence for the historical comparison");
  }

  if (inputs.removedClaims > 0) {
    const penalty = Math.min(2, inputs.removedClaims);
    points -= penalty;
    reasons.push(
      `${inputs.removedClaims} unsupported claim(s) removed in validation`
    );
  }

  const level: ConfidenceLevel =
    points >= 6 ? "High" : points >= 3 ? "Medium" : "Low";
  return { level, points, reasons };
}
