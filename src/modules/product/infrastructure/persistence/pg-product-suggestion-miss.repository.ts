import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IProductSuggestionMissRepository,
  TProductSuggestionMissSummaryPage,
} from '../../application/ports';
import { ProductSuggestionMiss } from '../../domain';
import { ProductSuggestionMissOrmEntity } from './product-suggestion-miss.orm-entity';
import { ProductSuggestionMissMapper } from './product-suggestion.mapper';

type TSummaryRow = {
  normalized_name: string;
  latest_detected_name: string;
  count: string;
  distributor_count: string;
  last_seen_at: Date;
};

@Injectable()
export class PgProductSuggestionMissRepository
  extends TypeOrmRepositoryBase<ProductSuggestionMissOrmEntity>
  implements IProductSuggestionMissRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ProductSuggestionMissOrmEntity);
  }

  async save(miss: ProductSuggestionMiss): Promise<void> {
    await this.repository.insert(ProductSuggestionMissMapper.toOrm(miss));
  }

  async listSummaries(query: {
    offset: number;
    limit: number;
  }): Promise<TProductSuggestionMissSummaryPage> {
    const rows = await this.repository
      .createQueryBuilder('miss')
      .select('miss.normalized_name', 'normalized_name')
      .addSelect(
        '(array_agg(miss.detected_name ORDER BY miss.created_at DESC))[1]',
        'latest_detected_name',
      )
      .addSelect('COUNT(*)', 'count')
      .addSelect('COUNT(DISTINCT miss.user_id)', 'distributor_count')
      .addSelect('MAX(miss.created_at)', 'last_seen_at')
      .groupBy('miss.normalized_name')
      .orderBy('count', 'DESC')
      .addOrderBy('last_seen_at', 'DESC')
      .addOrderBy('miss.normalized_name', 'ASC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany<TSummaryRow>();
    const totalRow = await this.repository
      .createQueryBuilder('miss')
      .select('COUNT(DISTINCT miss.normalized_name)', 'total')
      .getRawOne<{ total: string }>();
    return {
      items: rows.map((row) => ({
        normalizedName: row.normalized_name,
        latestDetectedName: row.latest_detected_name,
        count: Number(row.count),
        distributorCount: Number(row.distributor_count),
        lastSeenAt: new Date(row.last_seen_at),
      })),
      total: Number(totalRow?.total ?? 0),
    };
  }
}
