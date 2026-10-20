import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'product_suggestion_misses' })
@Index('IDX_product_suggestion_misses_normalized_name', ['normalizedName'])
export class ProductSuggestionMissOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  /** Distributor (user module id, no FK). */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'detected_name', type: 'text' })
  detectedName: string;

  @Column({ name: 'normalized_name', type: 'text' })
  normalizedName: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
