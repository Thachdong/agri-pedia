import { DomainException, EDomainErrorType } from '@shared/domain';

/** `diagnosisId` is required for a DIAGNOSIS_REPORT message and not allowed for a TEXT one. */
export class ChatInvalidDiagnosisReferenceException extends DomainException {
  constructor(type: string) {
    super(
      'CHAT_INVALID_DIAGNOSIS_REFERENCE',
      type === 'DIAGNOSIS_REPORT'
        ? 'A DIAGNOSIS_REPORT message needs a diagnosisId'
        : `A ${type} message cannot carry a diagnosisId`,
      EDomainErrorType.VALIDATION,
      { type },
    );
  }
}
