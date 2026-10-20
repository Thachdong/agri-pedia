import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The single row of product suggestion settings (id always 1). */
export const PRODUCT_SUGGESTION_SETTINGS_ROW_ID = 1;

@Entity({ name: 'product_suggestion_settings' })
export class ProductSuggestionSettingsOrmEntity {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'invalid_image_limit', type: 'int' })
  invalidImageLimit: number;

  @Column({ name: 'not_found_limit', type: 'int' })
  notFoundLimit: number;
}
