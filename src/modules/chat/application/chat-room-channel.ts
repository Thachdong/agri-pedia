/** Realtime channel of the connections that have this room's chat window open. */
export const chatRoomChannel = (roomId: string): string =>
  `chat-room:${roomId}`;
