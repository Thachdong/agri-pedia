import { DomainException, EDomainErrorType } from '@shared/domain';

/** Receiver is the sender, not ACTIVE, or has the same role (chat is FARMER <-> DISTRIBUTOR only). */
export class InvalidChatReceiverException extends DomainException {
  constructor(receiverId: string) {
    super(
      'CHAT_INVALID_RECEIVER',
      `Cannot chat with user ${receiverId}`,
      EDomainErrorType.BUSINESS_RULE,
      { receiverId },
    );
  }
}
