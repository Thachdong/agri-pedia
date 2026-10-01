import { DomainException, EDomainErrorType } from '@shared/domain';

/** Message empty after trim, or too long. */
export class InvalidChatMessageException extends DomainException {
  constructor(maxLength: number) {
    super(
      'CHAT_INVALID_MESSAGE',
      `Message must be 1..${maxLength} characters`,
      EDomainErrorType.VALIDATION,
      { maxLength },
    );
  }
}
