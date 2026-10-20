import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IProductSuggestionUsageRepository } from '../../application/ports';
import { ProductSuggestionUsage } from '../../domain';
import { ProductSuggestionUsageOrmEntity } from './product-suggestion-usage.orm-entity';
import { ProductSuggestionUsageMapper } from './product-suggestion.mapper';

@Injectable()
export class PgProductSuggestionUsageRepository
  extends TypeOrmRepositoryBase<ProductSuggestionUsageOrmEntity>
  implements IProductSuggestionUsageRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ProductSuggestionUsageOrmEntity);
  }

  /** Creates the row when missing (ON CONFLICT DO NOTHING: concurrent first requests are safe), then locks it. */
  async getForUpdate(userId: string): Promise<ProductSuggestionUsage> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({ userId, used: 0, bonusUsed: 0 })
      .orIgnore()
      .execute();
    const row = await this.repository.findOneOrFail({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });
    return ProductSuggestionUsageMapper.toDomain(row);
  }

  async save(usage: ProductSuggestionUsage): Promise<void> {
    await this.repository.save(ProductSuggestionUsageMapper.toOrm(usage));
  }
}
