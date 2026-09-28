import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** Keyset pagination of a user's notifications, newest first. */
@Index('IDX_notifications_user_created_id', ['userId', 'createdAt', 'id'])
@Entity({ name: 'notifications' })
export class NotificationOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  /** Recipient; owned by the user module, so no FK. */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'text' })
  content: string;

  /** Id of the thing the notification is about (e.g. review id); no FK. */
  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId: string | null;

  @Column({ name: 'is_read', type: 'boolean' })
  isRead: boolean;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
