import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IProductRepository, TProductPageQuery } from '../../application/ports';
import { EProductStatus, Product } from '../../domain';
import { ProductMapper } from './product.mapper';
import { ProductOrmEntity } from './product.orm-entity';

@Injectable()
export class PgProductRepository
  extends TypeOrmRepositoryBase<ProductOrmEntity>
  implements IProductRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ProductOrmEntity);
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.repository.findOneBy({ id, deletedAt: IsNull() });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async findActiveByUser(
    userId: string,
    { after, limit }: TProductPageQuery,
  ): Promise<Product[]> {
    const query = this.repository
      .createQueryBuilder('product')
      .where('product.user_id = :userId', { userId })
      .andWhere('product.status = :status', { status: EProductStatus.ACTIVE })
      .andWhere('product.deleted_at IS NULL');
    if (after) {
      // Row comparison matches the (created_at desc, id desc) order and uses IDX_products_user_created_id.
      query.andWhere('(product.created_at, product.id) < (:createdAt, :id)', {
        createdAt: after.createdAt,
        id: after.id,
      });
    }
    const rows = await query
      .orderBy('product.created_at', 'DESC')
      .addOrderBy('product.id', 'DESC')
      .limit(limit)
      .getMany();
    return rows.map((row) => ProductMapper.toDomain(row));
  }

  async findAllByUser(userId: string): Promise<Product[]> {
    const rows = await this.repository.findBy({ userId });
    return rows.map((row) => ProductMapper.toDomain(row));
  }

  async save(product: Product): Promise<void> {
    await this.repository.save(ProductMapper.toOrm(product));
  }
}
