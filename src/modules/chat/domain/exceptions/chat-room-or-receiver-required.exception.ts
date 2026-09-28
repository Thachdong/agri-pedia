import { DomainException, EDomainErrorType } from '@shared/domain';

/** Sending needs an existing room or a receiver to open one with. */
export class ChatRoomOrReceiverRequiredException extends DomainException {
  constructor() {
    super(
      'CHAT_ROOM_OR_RECEIVER_REQUIRED',
      'Either roomId or receiverId is required',
      EDomainErrorType.VALIDATION,
    );
  }
}
