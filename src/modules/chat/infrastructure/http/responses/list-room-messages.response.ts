export class RoomMessageResponse {
  id: string;
  senderId: string;
  /** Null when the sender no longer exists. */
  senderUsername: string | null;
  /** Signed read URL of the sender's avatar (expires); null when none. */
  senderAvatar: string | null;
  message: string;
  createdAt: Date;
}

export class ListRoomMessagesResponse {
  /** Newest first. */
  messages: RoomMessageResponse[];
  /** Pass as `cursor` to get older messages; null on the last page. */
  nextCursor: string | null;
}
