import { DomainException, EDomainErrorType } from '@shared/domain';

/** Diagnosis already finished (completed or failed); results can no longer change. */
export class DiagnosisNotProcessingException extends DomainException {
  constructor(diagnosisId: string) {
    super(
      'DIAGNOSIS_NOT_PROCESSING',
      `Diagnosis ${diagnosisId} is not processing`,
      EDomainErrorType.CONFLICT,
      { diagnosisId },
    );
  }
}
