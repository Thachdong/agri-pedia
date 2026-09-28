import { ChatRoom } from '../../../domain';
import { IChatRoomRepository } from '../chat-room.repository';

const isPair = (room: ChatRoom, userId: string, otherUserId: string) =>
  (room.firstUserId === userId && room.secondUserId === otherUserId) ||
  (room.firstUserId === otherUserId && room.secondUserId === userId);

export class InMemoryChatRoomRepository implements IChatRoomRepository {
  readonly items = new Map<string, ChatRoom>();

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
}
