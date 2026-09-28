import { DomainException, EDomainErrorType } from '@shared/domain';

/** No user with this receiver id. */
export class ChatReceiverNotFoundException extends DomainException {
  constructor(receiverId: string) {
    super(
      'CHAT_RECEIVER_NOT_FOUND',
      `Receiver ${receiverId} not found`,
      EDomainErrorType.NOT_FOUND,
      { receiverId },
    );
  }
}
