import { DomainException, EDomainErrorType } from '@shared/domain';

/** No chat room with this id. */
export class ChatRoomNotFoundException extends DomainException {
  constructor(roomId: string) {
    super(
      'CHAT_ROOM_NOT_FOUND',
      `Chat room ${roomId} not found`,
      EDomainErrorType.NOT_FOUND,
      { roomId },
    );
  }
}
