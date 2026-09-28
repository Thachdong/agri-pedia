import { ChatRoom } from '../../../domain';
import {
  IChatRoomRepository,
  TChatRoomPageQuery,
  TChatRoomSummary,
} from '../chat-room.repository';
import { InMemoryChatMessageRepository } from './in-memory-chat-message.repository';

const isPair = (room: ChatRoom, userId: string, otherUserId: string) =>
  (room.firstUserId === userId && room.secondUserId === otherUserId) ||
  (room.firstUserId === otherUserId && room.secondUserId === userId);

const isMember = (room: ChatRoom, userId: string) =>
  room.firstUserId === userId || room.secondUserId === userId;

const newestFirst = (a: ChatRoom, b: ChatRoom) =>
  b.lastMessageAt.getTime() - a.lastMessageAt.getTime() ||
  b.id.localeCompare(a.id);

/** Summaries read messages from `messages` (share it with the use case under test). */
export class InMemoryChatRoomRepository implements IChatRoomRepository {
  readonly items = new Map<string, ChatRoom>();

  constructor(
    private readonly messages = new InMemoryChatMessageRepository(),
  ) {}

  async findById(id: string): Promise<ChatRoom | null> {
    return this.items.get(id) ?? null;
  }

  async findByMembers(
    userId: string,
    otherUserId: string,
  ): Promise<ChatRoom | null> {
    return (
      [...this.items.values()].find((room) =>
        isPair(room, userId, otherUserId),
      ) ?? null
    );
  }

  async saveIfAbsent(room: ChatRoom): Promise<ChatRoom> {
    const existing = await this.findByMembers(
      room.firstUserId,
      room.secondUserId,
    );
    if (existing) {
      return existing;
    }
    this.items.set(room.id, room);
    return room;
  }

  async findPageByMember(
    userId: string,
    { after, limit }: TChatRoomPageQuery,
  ): Promise<TChatRoomSummary[]> {
    return [...this.items.values()]
      .filter((room) => isMember(room, userId))
      .sort(newestFirst)
      .filter(
        (room) =>
          !after ||
          room.lastMessageAt.getTime() < after.lastMessageAt.getTime() ||
          (room.lastMessageAt.getTime() === after.lastMessageAt.getTime() &&
            room.id < after.id),
      )
      .slice(0, limit)
      .map((room) => {
        const inRoom = this.messagesOf(room);
        return {
          room,
          lastMessage: inRoom[inRoom.length - 1] ?? null,
          unreadCount: this.unreadIn(room, userId),
        };
      });
  }

  async countUnreadByMember(userId: string): Promise<number> {
    return [...this.items.values()]
      .filter((room) => isMember(room, userId))
      .reduce((total, room) => total + this.unreadIn(room, userId), 0);
  }

  async save(room: ChatRoom): Promise<void> {
    this.items.set(room.id, room);
  }

  /** Oldest first. */
  private messagesOf(room: ChatRoom) {
    return [...this.messages.items.values()]
      .filter((message) => message.roomId === room.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private unreadIn(room: ChatRoom, userId: string): number {
    const readAt = room.lastReadAtOf(userId);
    return this.messagesOf(room).filter(
      (message) =>
        message.senderId !== userId && (!readAt || message.createdAt > readAt),
    ).length;
  }
}
