import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** numeric comes back from pg as a string. */
const numericToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

/** Keyset pagination of a seller's products, newest first. */
@Index('IDX_products_user_created_id', ['userId', 'createdAt', 'id'])
@Entity({ name: 'products' })
export class ProductOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Index('IDX_products_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    transformer: numericToNumber,
  })
  price: number;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 16 })
  unit: string;

  @Index('IDX_products_category_id')
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Soft delete marker; plain column (not @DeleteDateColumn) so filtering stays explicit in the repository. */
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
