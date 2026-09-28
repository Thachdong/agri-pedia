import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Last message of a room and unread counts (messages after a read marker). */
@Index('IDX_chat_messages_room_created', ['roomId', 'createdAt'])
@Entity({ name: 'chat_messages' })
export class ChatMessageOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  /** Owned by the user module, so no FK. */
  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
