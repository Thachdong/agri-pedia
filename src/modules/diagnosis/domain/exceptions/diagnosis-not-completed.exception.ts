import { DomainException, EDomainErrorType } from '@shared/domain';

/** Action needs a COMPLETED diagnosis. */
export class DiagnosisNotCompletedException extends DomainException {
  constructor(diagnosisId: string) {
    super(
      'DIAGNOSIS_NOT_COMPLETED',
      `Diagnosis ${diagnosisId} is not completed`,
      EDomainErrorType.CONFLICT,
      { diagnosisId },
    );
  }
}
