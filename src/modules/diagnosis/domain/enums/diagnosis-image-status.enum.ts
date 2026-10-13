/** Conclusion of one image; null on the image while processing. */
export enum EDiagnosisImageStatus {
  DISEASED = 'DISEASED',
  HEALTHY = 'HEALTHY',
  UNCERTAIN = 'UNCERTAIN',
  NOT_TARGET_CROP = 'NOT_TARGET_CROP',
  LOW_QUALITY = 'LOW_QUALITY',
}
