import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IProductRepository } from '../../application/ports';
import { Product } from '../../domain';
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

  async save(product: Product): Promise<void> {
    await this.repository.save(ProductMapper.toOrm(product));
  }
}
