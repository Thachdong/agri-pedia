import { ChatMessage, ChatRoom } from '../../domain';

export type TChatRoomPageKey = { lastMessageAt: Date; id: string };

export type TChatRoomPageQuery = {
  after?: TChatRoomPageKey;
  limit: number;
};

/** A room as seen by one member. */
export type TChatRoomSummary = {
  room: ChatRoom;
  /** Null only for a room without messages. */
  lastMessage: ChatMessage | null;
  /** Messages of the other member newer than this member's read marker. */
  unreadCount: number;
};

export interface IChatRoomRepository {
  findById(id: string): Promise<ChatRoom | null>;
  /** Room of this pair, whichever member opened it. */
  findByMembers(userId: string, otherUserId: string): Promise<ChatRoom | null>;
  /** Stores a new room; if the pair already has one (concurrent open), returns that room instead. */
  saveIfAbsent(room: ChatRoom): Promise<ChatRoom>;
  /** Rooms of `userId`, lastMessageAt desc then id desc, strictly after `after`. */
  findPageByMember(
    userId: string,
    query: TChatRoomPageQuery,
  ): Promise<TChatRoomSummary[]>;
  /** Unread messages of `userId` over all their rooms (same rule as unreadCount). */
  countUnreadByMember(userId: string): Promise<number>;
  /** Updates an existing room (last message, read markers). */
  save(room: ChatRoom): Promise<void>;
}

export const CHAT_ROOM_REPOSITORY = Symbol('CHAT_ROOM_REPOSITORY');
