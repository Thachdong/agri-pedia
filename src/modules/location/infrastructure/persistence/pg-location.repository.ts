import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { ILocationRepository } from '../../application/ports';
import { Province, Ward } from '../../domain';
import { LocationMapper } from './location.mapper';
import { ProvinceOrmEntity } from './province.orm-entity';
import { WardOrmEntity } from './ward.orm-entity';

@Injectable()
export class PgLocationRepository
  extends TypeOrmRepositoryBase<ProvinceOrmEntity>
  implements ILocationRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ProvinceOrmEntity);
  }

  /** Same manager (and transaction, if any) as `repository`. */
  private get wards(): Repository<WardOrmEntity> {
    return this.repository.manager.getRepository(WardOrmEntity);
  }

  async listProvinces(): Promise<Province[]> {
    const rows = await this.repository.find({ order: { sortOrder: 'ASC' } });
    return rows.map((row) => LocationMapper.provinceToDomain(row));
  }

  async provinceExists(provinceCode: string): Promise<boolean> {
    return this.repository.existsBy({ codename: provinceCode });
  }

  async listWardsByProvince(provinceCode: string): Promise<Ward[]> {
    const rows = await this.wards.find({
      where: { provinceCodename: provinceCode },
      order: { sortOrder: 'ASC' },
    });
    return rows.map((row) => LocationMapper.wardToDomain(row));
  }

  async wardExists(provinceCode: string, wardCode: string): Promise<boolean> {
    return this.wards.existsBy({
      provinceCodename: provinceCode,
      codename: wardCode,
    });
  }
}
