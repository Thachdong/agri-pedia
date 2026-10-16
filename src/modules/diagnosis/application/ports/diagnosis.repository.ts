import { Diagnosis } from '../../domain';

/** Keyset position in the newest-first listing. */
export type TDiagnosisPageKey = { createdAt: Date; id: string };

export interface IDiagnosisRepository {
  findById(id: string): Promise<Diagnosis | null>;
  /** null when missing or owned by another user. */
  findByIdForUser(id: string, userId: string): Promise<Diagnosis | null>;
  /** The user's diagnoses, newest first (createdAt desc, id desc), after `after` when given. */
  findByUser(
    userId: string,
    page: { after?: TDiagnosisPageKey; limit: number },
  ): Promise<Diagnosis[]>;
  /** PROCESSING diagnoses created before `before`. */
  findProcessingCreatedBefore(before: Date): Promise<Diagnosis[]>;
  /** Inserts or updates the diagnosis with its images. */
  save(diagnosis: Diagnosis): Promise<void>;
  /** Diagnoses the user created at or after `since`. */
  countByUserSince(userId: string, since: Date): Promise<number>;
}

export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');
