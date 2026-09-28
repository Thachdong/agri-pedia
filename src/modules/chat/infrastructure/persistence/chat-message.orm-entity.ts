import { Column, Entity, PrimaryColumn } from 'typeorm';

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
