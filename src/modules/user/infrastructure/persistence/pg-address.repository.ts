import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IAddressRepository } from '../../application/ports';
import { Address } from '../../domain';
import { AddressMapper } from './address.mapper';
import { AddressOrmEntity } from './address.orm-entity';

@Injectable()
export class PgAddressRepository
  extends TypeOrmRepositoryBase<AddressOrmEntity>
  implements IAddressRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, AddressOrmEntity);
  }

  async save(address: Address): Promise<void> {
    await this.repository.save(AddressMapper.toOrm(address));
  }

  async findPrimaryByUserId(userId: string): Promise<Address | null> {
    const row = await this.repository.findOneBy({ userId, isPrimary: true });
    return row ? AddressMapper.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Address[]> {
    const rows = await this.repository.find({
      where: { userId },
      order: { isPrimary: 'DESC', id: 'ASC' },
    });
    return rows.map((row) => AddressMapper.toDomain(row));
  }
}
