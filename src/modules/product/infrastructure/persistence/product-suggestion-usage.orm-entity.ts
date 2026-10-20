import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'product_suggestion_usages' })
export class ProductSuggestionUsageOrmEntity {
  /** Distributor (user module id, no FK). */
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  used: number;

  @Column({ name: 'bonus_used', type: 'int', default: 0 })
  bonusUsed: number;
}
