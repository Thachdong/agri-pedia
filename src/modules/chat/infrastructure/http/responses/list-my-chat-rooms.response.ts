export class ChatRoomLastMessageResponse {
  messageId: string;
  senderId: string;
  message: string;
}

export class ChatRoomResponse {
  roomId: string;
  otherUserId: string;
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
