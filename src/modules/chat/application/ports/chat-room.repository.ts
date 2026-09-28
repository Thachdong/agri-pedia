import { ChatRoom } from '../../domain';

export interface IChatRoomRepository {
  findById(id: string): Promise<ChatRoom | null>;
  /** Room of this pair, whichever member opened it. */
  findByMembers(userId: string, otherUserId: string): Promise<ChatRoom | null>;
  /** Stores a new room; if the pair already has one (concurrent open), returns that room instead. */
  saveIfAbsent(room: ChatRoom): Promise<ChatRoom>;
  /** Updates an existing room (last message, read markers). */
  save(room: ChatRoom): Promise<void>;
}

export const CHAT_ROOM_REPOSITORY = Symbol('CHAT_ROOM_REPOSITORY');
