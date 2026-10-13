import { TObservationFeature } from './observation-features';

/** Observed value -> weight (-2..+4); values not listed weigh 0. */
export type TFeatureWeights = Partial<
  Record<TObservationFeature, Record<string, number>>
>;

/** Weights of one KB entry (`profile.json` -> `profiles[code]`). */
export type TDiseaseProfile = {
  /** Weights of an entry without variants, and the base every variant overrides. */
  base?: TFeatureWeights;
  /** variantCode -> overrides per (feature, value) on top of `base`; `{}` = same as base. */
  variants?: Record<string, TFeatureWeights>;
};

/** One thing that gets scored: an entry without variants, or one variant of an entry. */
export type TScoringUnit = {
  diseaseCode: string;
  variantCode: string | null;
  weights: TFeatureWeights;
};

/** `base` with `override` applied per (feature, value). */
export function mergeWeights(
  base: TFeatureWeights = {},
  override: TFeatureWeights = {},
): TFeatureWeights {
  const merged: TFeatureWeights = {};
  for (const feature of new Set([
    ...Object.keys(base),
    ...Object.keys(override),
  ]) as Set<TObservationFeature>) {
    merged[feature] = { ...base[feature], ...override[feature] };
  }
  return merged;
}
