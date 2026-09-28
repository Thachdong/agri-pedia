import { DomainException, EDomainErrorType } from '@shared/domain';

/** User is not one of the two room members. */
export class ChatNotRoomMemberException extends DomainException {
  constructor(roomId: string, userId: string) {
    super(
      'CHAT_NOT_ROOM_MEMBER',
      `User ${userId} is not a member of chat room ${roomId}`,
      EDomainErrorType.FORBIDDEN,
      { roomId, userId },
    );
  }
}
