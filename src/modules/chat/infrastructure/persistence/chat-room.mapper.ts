import { ChatRoom } from '../../domain';
import { ChatRoomOrmEntity } from './chat-room.orm-entity';

export class ChatRoomMapper {
  static toDomain(row: ChatRoomOrmEntity): ChatRoom {
    return ChatRoom.restore(row.id, {
      firstUserId: row.firstUserId,
      secondUserId: row.secondUserId,
      createdAt: row.createdAt,
      lastMessageAt: row.lastMessageAt,
      firstUserLastReadAt: row.firstUserLastReadAt,
      secondUserLastReadAt: row.secondUserLastReadAt,
    });
  }

  static toOrm(room: ChatRoom): ChatRoomOrmEntity {
    return Object.assign(new ChatRoomOrmEntity(), {
      id: room.id,
      firstUserId: room.firstUserId,
      secondUserId: room.secondUserId,
      createdAt: room.createdAt,
      lastMessageAt: room.lastMessageAt,
      firstUserLastReadAt: room.firstUserLastReadAt,
      secondUserLastReadAt: room.secondUserLastReadAt,
    });
  }
}
