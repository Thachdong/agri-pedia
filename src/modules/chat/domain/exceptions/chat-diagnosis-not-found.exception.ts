import { DomainException, EDomainErrorType } from '@shared/domain';

/** The diagnosis does not exist, or (when sending) is not the sender's. */
export class ChatDiagnosisNotFoundException extends DomainException {
  constructor(diagnosisId: string) {
    super(
      'CHAT_DIAGNOSIS_NOT_FOUND',
      `Diagnosis ${diagnosisId} not found`,
      EDomainErrorType.NOT_FOUND,
      { diagnosisId },
    );
  }
}
