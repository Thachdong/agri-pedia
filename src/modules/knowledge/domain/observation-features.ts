/**
 * Observation enum of one feature, per crop (KB `profile.json` -> `features`).
 * `region` features describe one region; `image` features describe the whole image and apply to all its regions.
 */
export type TObservationFeatureSpec = {
  level: 'region' | 'image';
  /** Allowed values, `UNSURE` included. */
  values: string[];
  /** `image` features only: values that are not a symptom. */
  normal?: string[];
  /** What the feature describes, for the vision prompt. */
  descriptionEn?: string;
  /** value -> hint for the vision prompt (only values that are easy to mix up). */
  hintsEn?: Record<string, string>;
};

/** feature name -> spec; names may differ between crops (e.g. rice `panicle`, durian `fruit`). */
export type TObservationFeatures = Record<string, TObservationFeatureSpec>;

/** Observed value per feature; missing or `UNSURE` features are ignored when scoring. */
export type TObservation = Record<string, string>;

/** Value never scored: the observer was not sure. */
export const UNSURE = 'UNSURE';
