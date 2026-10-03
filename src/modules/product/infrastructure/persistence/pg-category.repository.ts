import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { ICategoryRepository, TCategory } from '../../application/ports';
import { CategoryOrmEntity } from './category.orm-entity';

@Injectable()
export class PgCategoryRepository
  extends TypeOrmRepositoryBase<CategoryOrmEntity>
  implements ICategoryRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, CategoryOrmEntity);
  }

  async existsById(id: string): Promise<boolean> {
    return this.repository.existsBy({ id });
  }

  async findAll(): Promise<TCategory[]> {
    const rows = await this.repository.find({ order: { name: 'ASC' } });
    return rows.map(({ id, name }) => ({ id, name }));
  }
}
