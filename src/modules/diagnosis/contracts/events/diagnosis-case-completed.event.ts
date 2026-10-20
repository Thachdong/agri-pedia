import { TIntegrationEvent } from '@shared/event-bus';

/** A diagnosis completed; carries its whole result (sent after the owner was notified). */
export const DIAGNOSIS_CASE_COMPLETED_EVENT = 'diagnosis.case.completed';

/** Confidence level of a conclusion. */
export type TDiagnosisConfidenceLevelPayload = 'HIGH' | 'MEDIUM' | 'LOW';

/** Normalized box on the stored image: 0..1, x/y = top-left corner. */
export type TDiagnosisBoxPayload = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TDiagnosisCompletedDiseasePayload = {
  diseaseCode: string;
  variantCode: string | null;
  level: TDiagnosisConfidenceLevelPayload;
  /** Not calibrated; only for ranking. */
  score: number;
};

export type TDiagnosisCompletedRegionPayload = {
  box: TDiagnosisBoxPayload;
  /** Disease of the verify answer; null when the region was not verified. */
  diseaseCode: string | null;
  /** null = uncertain region. */
  level: TDiagnosisConfidenceLevelPayload | null;
  score: number | null;
};

export type TDiagnosisCompletedImagePayload = {
  /** Order of the image as sent, from 0. */
  sortOrder: number;
  /** Stored file (`diagnoses/<diagnosisId>/<mediaId>.jpg`); null when the upload failed. */
  key: string | null;
  /** Part chosen by the user. */
  plantPart: string;
  /** Part recognized by the AI; null when unsure. */
  detectedPart: string | null;
  diseases: TDiagnosisCompletedDiseasePayload[];
  regions: TDiagnosisCompletedRegionPayload[];
};

export type TDiagnosisCaseCompletedEventPayload = {
  diagnosisId: string;
  cropType: string;
  /** AI provider, models, prompt and KB versions used. */
  provider: string;
  model: string;
  promptVersion: string;
  kbVersion: string;
  /** Two different diseases are HIGH on different images. */
  conflict: boolean;
  images: TDiagnosisCompletedImagePayload[];
};

export type TDiagnosisCaseCompletedEvent = TIntegrationEvent<
  typeof DIAGNOSIS_CASE_COMPLETED_EVENT,
  TDiagnosisCaseCompletedEventPayload
>;
