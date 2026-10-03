import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'media' })
@Index('IDX_media_owner', ['ownerType', 'ownerId'])
export class MediaOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'varchar', length: 16 })
  extension: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 512 })
  source: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 32 })
  ownerType: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ name: 'sort_order', type: 'integer', nullable: true })
  sortOrder: number | null;
}
