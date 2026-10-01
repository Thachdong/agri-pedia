import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only an ACTIVE FARMER or DISTRIBUTOR may send messages. */
export class ChatSenderNotAllowedException extends DomainException {
  constructor(userId: string) {
    super(
      'CHAT_SENDER_NOT_ALLOWED',
      `User ${userId} is not an active user`,
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
