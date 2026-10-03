import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * One room per pair, whichever member opened it: unique on
 * (LEAST(first_user_id, second_user_id), GREATEST(...)). Expression index,
 * so TypeORM cannot generate it — created by hand in the migration.
 */
@Index('UQ_chat_rooms_members', { synchronize: false })
/** Keyset pagination of a member's rooms, newest message first (one index per member column). */
@Index('IDX_chat_rooms_first_user_last_message', [
  'firstUserId',
  'lastMessageAt',
  'id',
])
@Index('IDX_chat_rooms_second_user_last_message', [
  'secondUserId',
  'lastMessageAt',
  'id',
])
@Entity({ name: 'chat_rooms' })
export class ChatRoomOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  /** User ids are owned by the user module, so no FK. */
  @Column({ name: 'first_user_id', type: 'uuid' })
  firstUserId: string;

  @Column({ name: 'second_user_id', type: 'uuid' })
  secondUserId: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamptz' })
  lastMessageAt: Date;

  @Column({
    name: 'first_user_last_read_at',
    type: 'timestamptz',
    nullable: true,
  })
  firstUserLastReadAt: Date | null;

  @Column({
    name: 'second_user_last_read_at',
    type: 'timestamptz',
    nullable: true,
  })
  secondUserLastReadAt: Date | null;
}
