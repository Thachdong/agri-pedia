import { EChatMessageType } from '../../../domain';

export class ChatRoomLastMessageResponse {
  messageId: string;
  senderId: string;
  /** Preview text (for DIAGNOSIS_REPORT: the text sent with the report). */
  message: string;
  type: EChatMessageType;
  /** Shared diagnosis (DIAGNOSIS_REPORT); null for TEXT. */
  diagnosisId: string | null;
}

export class ChatRoomResponse {
  roomId: string;
  otherUserId: string;
  /** Null when the other user no longer exists. */
  otherUsername: string | null;
  /** Signed read URL of the other user's avatar (expires); null when none. */
  otherUserAvatar: string | null;
  /** Null only for a room without messages. */
  lastMessage: ChatRoomLastMessageResponse | null;
  lastMessageAt: Date;
  /** Messages from the other member I have not read yet. */
  unreadCount: number;
}

export class ListMyChatRoomsResponse {
  /** Unread messages over all my rooms (not only this page). */
  totalUnread: number;
  /** Most recent message first. */
  rooms: ChatRoomResponse[];
  /** Pass as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
}
