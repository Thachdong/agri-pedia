import { Inject, Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  ICatalogRepository,
  TCatalogPage,
  TCatalogPageQuery,
} from '../../application/ports';
import { CatalogItem, CatalogItemNameTakenException } from '../../domain';
import {
  CATALOG_ITEM_NORMALIZED_NAME_UNIQUE,
  CatalogItemOrmEntity,
} from './catalog-item.orm-entity';
import { CatalogItemMapper } from './product-suggestion.mapper';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class PgCatalogRepository
  extends TypeOrmRepositoryBase<CatalogItemOrmEntity>
  implements ICatalogRepository
{
  private readonly matchThreshold: number;

  constructor(
    dataSource: DataSource,
    @Inject(CONFIG_SERVICE) config: IConfigService,
  ) {
    super(dataSource, CatalogItemOrmEntity);
    this.matchThreshold = config.get('productSuggestion').matchThreshold;
  }

  /** pg_trgm similarity, highest first; ties go to the shorter name. */
  async findBestMatch(normalizedName: string): Promise<CatalogItem | null> {
    const row = await this.repository
      .createQueryBuilder('item')
      .where('similarity(item.normalized_name, :name) >= :threshold', {
        name: normalizedName,
        threshold: this.matchThreshold,
      })
      .orderBy('similarity(item.normalized_name, :name)', 'DESC')
      .addOrderBy('length(item.normalized_name)', 'ASC')
      .limit(1)
      .getOne();
    return row ? CatalogItemMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<CatalogItem | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? CatalogItemMapper.toDomain(row) : null;
  }

  async findByNormalizedName(
    normalizedName: string,
  ): Promise<CatalogItem | null> {
    const row = await this.repository.findOneBy({ normalizedName });
    return row ? CatalogItemMapper.toDomain(row) : null;
  }

  async listPage(query: TCatalogPageQuery): Promise<TCatalogPage> {
    const builder = this.repository.createQueryBuilder('item');
    if (query.search) {
      // Normalized text holds only [a-z0-9 ], nothing to escape for LIKE.
      builder.where('item.normalized_name LIKE :pattern', {
        pattern: `%${query.search}%`,
      });
    }
    const [rows, total] = await builder
      .orderBy('item.name', 'ASC')
      .addOrderBy('item.id', 'ASC')
      .skip(query.offset)
      .take(query.limit)
      .getManyAndCount();
    return { items: rows.map(CatalogItemMapper.toDomain), total };
  }

  async save(item: CatalogItem): Promise<void> {
    try {
      await this.repository.save(CatalogItemMapper.toOrm(item));
    } catch (error) {
      if (isUniqueViolation(error, CATALOG_ITEM_NORMALIZED_NAME_UNIQUE)) {
        throw new CatalogItemNameTakenException(item.name);
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}

const isUniqueViolation = (error: unknown, constraint: string): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === PG_UNIQUE_VIOLATION &&
    driverError.constraint === constraint
  );
};
