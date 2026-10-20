import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

export const CATALOG_ITEM_NORMALIZED_NAME_UNIQUE =
  'UQ_product_catalog_items_normalized_name';

@Entity({ name: 'product_catalog_items' })
@Index(CATALOG_ITEM_NORMALIZED_NAME_UNIQUE, ['normalizedName'], {
  unique: true,
})
// GIN trigram index (similarity match + LIKE search) is created by the migration; TypeORM must not drop it.
@Index('IDX_product_catalog_items_normalized_name_trgm', { synchronize: false })
export class CatalogItemOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
