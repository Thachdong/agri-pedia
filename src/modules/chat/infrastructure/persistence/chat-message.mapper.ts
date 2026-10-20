import { ChatMessage, EChatMessageType } from '../../domain';
import { ChatMessageOrmEntity } from './chat-message.orm-entity';

export class ChatMessageMapper {
  static toDomain(row: ChatMessageOrmEntity): ChatMessage {
    return ChatMessage.restore(row.id, {
      roomId: row.roomId,
      senderId: row.senderId,
      message: row.message,
      type: row.type as EChatMessageType,
      diagnosisId: row.diagnosisId,
      createdAt: row.createdAt,
    });
  }

  static toOrm(message: ChatMessage): ChatMessageOrmEntity {
    return Object.assign(new ChatMessageOrmEntity(), {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      message: message.message,
      type: message.type,
      diagnosisId: message.diagnosisId,
      createdAt: message.createdAt,
    });
  }
}
