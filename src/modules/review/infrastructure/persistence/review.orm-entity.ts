import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** One review per (author, target); also serves lookups by author. */
@Index('UQ_reviews_user_target', ['userId', 'targetType', 'targetId'], {
  unique: true,
})
@Entity({ name: 'reviews' })
export class ReviewOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'target_type', type: 'varchar', length: 16 })
  targetType: string;

  /** Product id or user id (per target_type); owned by another module, so no FK. */
  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'smallint' })
  star: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
