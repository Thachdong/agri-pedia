import { EConfidenceLevel } from './enums/confidence-level.enum';

/** Normalized box on the stored (EXIF-rotated) image: 0..1, x/y = top-left corner. */
export type TBox = { x: number; y: number; w: number; h: number };

/** Observed enum value per feature (knowledge base features), e.g. `{ lesionShape: 'SPINDLE_DIAMOND' }`. */
export type TObservations = Record<string, string>;

/** `score` is not calibrated; only for ranking. */
export type TConfidence = { level: EConfidenceLevel; score: number };

/** Knowledge base candidate of a region (B2). */
export type TRegionCandidate = {
  diseaseCode: string;
  variantCode: string | null;
  matchScore: number;
};

/** Verify step (B3) answer kept for a region. */
export type TRegionVerdict = {
  diseaseCode: string;
  variantCode: string | null;
  isLesion: boolean;
  selfConfidence: EConfidenceLevel;
  /** Supporting features, Vietnamese, for display. */
  features: string[];
};

/** One abnormal region of an image, as stored. */
export type TDiagnosisRegion = {
  box: TBox;
  observations: TObservations;
  descriptionEn: string;
  descriptionVi: string;
  candidates: TRegionCandidate[];
  verdict: TRegionVerdict | null;
  /** null = UNCERTAIN region (no candidate, or B2 and B3 disagree). */
  confidence: TConfidence | null;
};

/** Disease concluded for an image (best region per disease). */
export type TImageDisease = {
  diseaseCode: string;
  variantCode: string | null;
  confidence: TConfidence;
};

/** Whole-case result, merged over images. */
export type TDiagnosisSummary = {
  hasDisease: boolean;
  /** Two different diseases are HIGH on different images. */
  conflict: boolean;
  diseases: Array<{
    diseaseCode: string;
    confidence: TConfidence;
    imageCount: number;
  }>;
};
