import { DomainException, EDomainErrorType } from '@shared/domain';

/** The message does not share a diagnosis report. */
export class ChatMessageNotDiagnosisReportException extends DomainException {
  constructor(messageId: string) {
    super(
      'CHAT_MESSAGE_NOT_DIAGNOSIS_REPORT',
      `Message ${messageId} is not a diagnosis report`,
      EDomainErrorType.VALIDATION,
      { messageId },
    );
  }
}
