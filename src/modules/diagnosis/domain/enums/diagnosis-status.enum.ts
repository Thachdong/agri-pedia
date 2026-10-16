export enum EDiagnosisStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  /** Every image failed at the AI provider, or processing was interrupted. */
  FAILED = 'FAILED',
}
