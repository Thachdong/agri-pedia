import { DomainException, EDomainErrorType } from '@shared/domain';

/** No such message in the room. */
export class ChatMessageNotFoundException extends DomainException {
  constructor(roomId: string, messageId: string) {
    super(
      'CHAT_MESSAGE_NOT_FOUND',
      `Message ${messageId} not found in room ${roomId}`,
      EDomainErrorType.NOT_FOUND,
      { roomId, messageId },
    );
  }
}
