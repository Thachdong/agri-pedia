/**
 * Observation enum of one feature of a crop (a vision step fills it in, the knowledge base scores it).
 * `region` features describe one region; `image` features describe the whole image.
 */
export type TKnowledgeObservationFeature = {
  level: 'region' | 'image';
  /** Allowed values, `UNSURE` included. */
  values: string[];
  /** `image` features only: values that are not a symptom. */
  normal?: string[];
  /** What the feature describes, for a vision prompt. */
  descriptionEn?: string;
  /** value -> hint for a vision prompt. */
  hintsEn?: Record<string, string>;
};

/** feature name -> enum; names differ between crops. */
export type TKnowledgeObservationFeatures = Record<
  string,
  TKnowledgeObservationFeature
>;

/** Observed value per feature; missing or `UNSURE` features are not scored. */
export type TKnowledgeObservation = Record<string, string>;
