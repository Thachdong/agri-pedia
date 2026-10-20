import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IProductSuggestionSettingsRepository } from '../../application/ports';
import { ProductSuggestionSettings } from '../../domain';
import {
  PRODUCT_SUGGESTION_SETTINGS_ROW_ID,
  ProductSuggestionSettingsOrmEntity,
} from './product-suggestion-settings.orm-entity';
import { ProductSuggestionSettingsMapper } from './product-suggestion.mapper';

@Injectable()
export class PgProductSuggestionSettingsRepository
  extends TypeOrmRepositoryBase<ProductSuggestionSettingsOrmEntity>
  implements IProductSuggestionSettingsRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ProductSuggestionSettingsOrmEntity);
  }

  async get(): Promise<ProductSuggestionSettings> {
    const row = await this.repository.findOneBy({
      id: PRODUCT_SUGGESTION_SETTINGS_ROW_ID,
    });
    return row
      ? ProductSuggestionSettingsMapper.toDomain(row)
      : ProductSuggestionSettings.defaults();
  }

  async save(settings: ProductSuggestionSettings): Promise<void> {
    await this.repository.save(ProductSuggestionSettingsMapper.toOrm(settings));
  }
}
