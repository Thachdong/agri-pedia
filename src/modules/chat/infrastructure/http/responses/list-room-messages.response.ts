import { EChatMessageType } from '../../../domain';

export class RoomMessageResponse {
  id: string;
  senderId: string;
  /** Null when the sender no longer exists. */
  senderUsername: string | null;
  /** Signed read URL of the sender's avatar (expires); null when none. */
  senderAvatar: string | null;
  message: string;
  type: EChatMessageType;
  /** Shared diagnosis (DIAGNOSIS_REPORT): read it with GET /chat/rooms/{roomId}/messages/{messageId}/diagnosis; null for TEXT. */
  diagnosisId: string | null;
  createdAt: Date;
}

export class ListRoomMessagesResponse {
  /** Newest first. */
  messages: RoomMessageResponse[];
  /** Pass as `cursor` to get older messages; null on the last page. */
  nextCursor: string | null;
}
