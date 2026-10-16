import { DomainException, EDomainErrorType } from '@shared/domain';

/** No diagnosis with this id for the user (another user's diagnosis reads as missing). */
export class DiagnosisNotFoundException extends DomainException {
  constructor(diagnosisId: string) {
    super(
      'DIAGNOSIS_NOT_FOUND',
      `Diagnosis ${diagnosisId} not found`,
      EDomainErrorType.NOT_FOUND,
      { diagnosisId },
    );
  }
}
