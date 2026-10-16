import {
  TKnowledgeObservation,
  TKnowledgeObservationFeatures,
} from './observation-features';

/** Crop with what a diagnosis needs to describe and score its photos. */
export type TKnowledgeDiagnosisCrop = {
  code: string;
  /** e.g. `durian`. */
  nameEn: string;
  /** Supported by diagnosis. */
  enabled: boolean;
  /** KB version of the crop's diseases and profile, e.g. `2026-10-12`. */
  kbVersion: string;
  /** Parts a photo of this crop may show (plant part codes) and their name in a vision prompt. */
  plantParts: Array<{ code: string; promptEn: string }>;
  /** Observation enums of the crop. */
  features: TKnowledgeObservationFeatures;
  prompt: {
    /** e.g. `durian trees (Durio zibethinus)`. */
    subjectEn: string;
    /** Whole-plant symptoms worth reporting without a distinct lesion. */
    wholeImageCuesEn: string;
  };
};

export type TFindCandidatesInput = {
  cropType: string;
  /** Plant part code (one of the crop's) to filter by; null = any part. */
  part: string | null;
  /** Whole-image observations, added to every region. */
  wholeImage: TKnowledgeObservation;
  regions: TKnowledgeObservation[];
  /** Max candidates per region. */
  limit: number;
};

export type TKnowledgeCandidate = {
  diseaseCode: string;
  variantCode: string | null;
  /** Softmax score over every scored entry; for ranking only, not a probability. */
  matchScore: number;
};

/** English summary of a candidate for an AI verify step. */
export type TKnowledgeDiseaseCard = {
  /** diseaseCode or variantCode. */
  code: string;
  name: string;
  symptoms: string[];
  visualKeywords: string[];
  /** Differences to the other requested codes only. */
  distinguishFrom: Array<{ code: string; feature: string }>;
};

export type TKnowledgeDiseaseName = {
  /** Requested diseaseCode or variantCode. */
  code: string;
  diseaseCode: string;
  diseaseName: string;
  /** null for a diseaseCode. */
  variantName: string | null;
  category: 'DISEASE' | 'PEST' | 'DISORDER';
};

export interface IKnowledgeQueryPort {
  /** Crop with its diagnosis status and configuration (enabled or not); null when unknown. */
  findDiagnosisCrop(cropType: string): Promise<TKnowledgeDiagnosisCrop | null>;
  /**
   * Top candidates per region (same order as `regions`), scored on region + whole-image observations;
   * GEMINI_ONLY entries and entries without a scoring profile are never candidates.
   */
  findCandidates(input: TFindCandidatesInput): Promise<TKnowledgeCandidate[][]>;
  /** Cards of the given diseaseCodes / variantCodes; unknown codes are left out. */
  getDiseaseCards(codes: string[]): Promise<TKnowledgeDiseaseCard[]>;
  /** Vietnamese names of the given diseaseCodes / variantCodes; unknown codes are left out. */
  getDiseaseNames(codes: string[]): Promise<TKnowledgeDiseaseName[]>;
}
