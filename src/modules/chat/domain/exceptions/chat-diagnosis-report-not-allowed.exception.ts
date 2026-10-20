import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only a FARMER shares a diagnosis report. */
export class ChatDiagnosisReportNotAllowedException extends DomainException {
  constructor(senderId: string) {
    super(
      'CHAT_DIAGNOSIS_REPORT_NOT_ALLOWED',
      `User ${senderId} may not send a diagnosis report`,
      EDomainErrorType.FORBIDDEN,
      { senderId },
    );
  }
}
