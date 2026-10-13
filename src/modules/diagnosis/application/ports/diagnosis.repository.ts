import { Diagnosis } from '../../domain';

export interface IDiagnosisRepository {
  /** Inserts or updates the diagnosis with its images. */
  save(diagnosis: Diagnosis): Promise<void>;
  /** Diagnoses the user created at or after `since`. */
  countByUserSince(userId: string, since: Date): Promise<number>;
}

export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');
