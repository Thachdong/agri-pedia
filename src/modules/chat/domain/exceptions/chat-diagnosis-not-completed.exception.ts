import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only a COMPLETED diagnosis is shared. */
export class ChatDiagnosisNotCompletedException extends DomainException {
  constructor(diagnosisId: string, status: string) {
    super(
      'CHAT_DIAGNOSIS_NOT_COMPLETED',
      `Diagnosis ${diagnosisId} is ${status}, not COMPLETED`,
      EDomainErrorType.CONFLICT,
      { diagnosisId, status },
    );
  }
}
