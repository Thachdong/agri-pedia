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
}
