import { TScoringUnit } from '../disease-profile';
import {
  TObservation,
  TObservationFeature,
  UNSURE,
} from '../observation-features';

/** Softmax temperature; tune after measuring. */
export const SCORE_TEMPERATURE = 1;

export type TScoredCandidate = {
  diseaseCode: string;
  variantCode: string | null;
  /** Sum of matched weights. */
  raw: number;
  /** Softmax of `raw` over every scored unit; only for ranking, not a probability. */
  matchScore: number;
};

/** Sum of the unit's weights for each observed value (missing / UNSURE ignored). */
export function rawScore(
  unit: TScoringUnit,
  observation: TObservation,
): number {
  let raw = 0;
  for (const [feature, value] of Object.entries(observation) as Array<
    [TObservationFeature, string | undefined]
  >) {
    if (value === undefined || value === UNSURE) continue;
    raw += unit.weights[feature]?.[value] ?? 0;
  }
  return raw;
}

/**
 * B2 scoring of one observed region: raw score per unit, softmax over all units,
 * drop raw <= 0, keep the best unit per disease, top `limit` by raw.
 */
export function scoreCandidates(
  units: TScoringUnit[],
  observation: TObservation,
  limit: number,
): TScoredCandidate[] {
  if (units.length === 0) return [];
  const raws = units.map((unit) => rawScore(unit, observation));
  const max = Math.max(...raws);
  const exps = raws.map((raw) => Math.exp((raw - max) / SCORE_TEMPERATURE));
  const sum = exps.reduce((total, value) => total + value, 0);

  const bestByDisease = new Map<string, TScoredCandidate>();
  units.forEach((unit, index) => {
    const raw = raws[index];
    if (raw <= 0) return;
    const current = bestByDisease.get(unit.diseaseCode);
    if (current && current.raw >= raw) return;
    bestByDisease.set(unit.diseaseCode, {
      diseaseCode: unit.diseaseCode,
      variantCode: unit.variantCode,
      raw,
      matchScore: exps[index] / sum,
    });
  });

  return [...bestByDisease.values()]
    .sort((a, b) => b.raw - a.raw)
    .slice(0, limit);
}
