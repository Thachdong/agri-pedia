import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only a FARMER may open a new room; a DISTRIBUTOR only replies in an existing one. */
export class ChatRoomOpenNotAllowedException extends DomainException {
  constructor(senderId: string, receiverId: string) {
    super(
      'CHAT_ROOM_OPEN_NOT_ALLOWED',
      `User ${senderId} may not open a chat room with ${receiverId}`,
      EDomainErrorType.FORBIDDEN,
      { senderId, receiverId },
    );
  }
}
