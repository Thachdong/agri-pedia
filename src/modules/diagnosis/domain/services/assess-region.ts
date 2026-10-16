import {
  TConfidence,
  TRegionCandidate,
  TRegionVerdict,
} from '../diagnosis-result.types';
import { EConfidenceLevel } from '../enums/confidence-level.enum';

/** B2 top-1 matchScore needed for HIGH; tune after measuring. */
export const MATCH_SCORE_THRESHOLD = 0.6;

const SELF_CONFIDENCE_SCORE: Record<EConfidenceLevel, number> = {
  [EConfidenceLevel.HIGH]: 0.9,
  [EConfidenceLevel.MEDIUM]: 0.6,
  [EConfidenceLevel.LOW]: 0.3,
};

/** Verify step (B3) answer for one region; `verdict` = one of the region's candidate codes or `NONE`. */
export type TVerifyRegionResult = {
  verdict: string;
  isLesion: boolean;
  supportingFeatures: string[];
  selfConfidence: EConfidenceLevel;
};

/** Code a candidate is shown to the verify step with: variantCode, else diseaseCode. */
export function candidateCode(candidate: TRegionCandidate): string {
  return candidate.variantCode ?? candidate.diseaseCode;
}

/** `RICE_BLAST__V1` -> `RICE_BLAST`. */
export function diseaseCodeOf(code: string): string {
  return code.split('__')[0];
}

/**
 * B4 for one region. Returns null when the region is dropped (verdict NONE, not a lesion,
 * a code outside the candidates, or missing from the verify answer).
 * No candidates: kept as UNCERTAIN. Verdict on another disease than top-1: kept as UNCERTAIN (LOW).
 */
export function assessRegion(
  candidates: TRegionCandidate[],
  verify: TVerifyRegionResult | null,
): { verdict: TRegionVerdict | null; confidence: TConfidence | null } | null {
  if (candidates.length === 0) return { verdict: null, confidence: null };
  if (!verify || !verify.isLesion) return null;
  const chosen = candidates.find((c) => candidateCode(c) === verify.verdict);
  if (!chosen) return null;

  const verdict: TRegionVerdict = {
    diseaseCode: chosen.diseaseCode,
    variantCode: chosen.variantCode,
    isLesion: true,
    selfConfidence: verify.selfConfidence,
    features: verify.supportingFeatures,
  };
  const top = candidates[0];
  if (chosen.diseaseCode !== top.diseaseCode) {
    return { verdict, confidence: null };
  }
  const level =
    top.matchScore >= MATCH_SCORE_THRESHOLD &&
    verify.selfConfidence !== EConfidenceLevel.LOW
      ? EConfidenceLevel.HIGH
      : EConfidenceLevel.MEDIUM;
  const score =
    0.5 * top.matchScore + 0.5 * SELF_CONFIDENCE_SCORE[verify.selfConfidence];
  return {
    verdict,
    confidence: { level, score: Math.round(score * 100) / 100 },
  };
}
