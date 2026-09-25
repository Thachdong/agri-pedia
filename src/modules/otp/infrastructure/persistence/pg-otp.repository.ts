import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IOtpRepository } from '../../application/ports';
import { Otp } from '../../domain';
import { OtpMapper } from './otp.mapper';
import { OtpOrmEntity } from './otp.orm-entity';

@Injectable()
export class PgOtpRepository
  extends TypeOrmRepositoryBase<OtpOrmEntity>
  implements IOtpRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, OtpOrmEntity);
  }

  async save(otp: Otp): Promise<void> {
    await this.repository.save(OtpMapper.toOrm(otp));
  }
}
