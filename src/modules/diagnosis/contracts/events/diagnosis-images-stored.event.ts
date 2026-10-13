import { TIntegrationEvent } from '@shared/event-bus';

/** Diagnosis images were uploaded by the server to their final keys; they need Media records (no move). */
export const DIAGNOSIS_IMAGES_STORED_EVENT = 'diagnosis.images.stored';

export type TDiagnosisStoredFilePayload = {
  /** Id chosen by diagnosis and used in the key. */
  mediaId: string;
  /** `diagnoses/<diagnosisId>/<mediaId>.jpg`. */
  key: string;
  extension: 'jpg';
  filename: string;
  /** Order of the image as sent, from 0. */
  sortOrder: number;
};

export type TDiagnosisImagesStoredEventPayload = {
  diagnosisId: string;
  /** Owner of the diagnosis. */
  userId: string;
  files: TDiagnosisStoredFilePayload[];
};

export type TDiagnosisImagesStoredEvent = TIntegrationEvent<
  typeof DIAGNOSIS_IMAGES_STORED_EVENT,
  TDiagnosisImagesStoredEventPayload
>;
