import { TProcessedImage } from './image-processor';

export type TDiagnosisJob = {
  diagnosisId: string;
  /** Normalized images, by sortOrder; kept in memory until processing ends. */
  images: TProcessedImage[];
};

/** Runs the diagnosis pipeline in the background (the request does not wait for it). */
export interface IDiagnosisJobRunner {
  start(job: TDiagnosisJob): void;
}

export const DIAGNOSIS_JOB_RUNNER = Symbol('DIAGNOSIS_JOB_RUNNER');
