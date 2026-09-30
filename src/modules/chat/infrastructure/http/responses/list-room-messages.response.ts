export class RoomMessageResponse {
  id: string;
  senderId: string;
  message: string;
  createdAt: Date;
}

export class ListRoomMessagesResponse {
  /** Newest first. */
  messages: RoomMessageResponse[];
  /** Pass as `cursor` to get older messages; null on the last page. */
  nextCursor: string | null;
}
