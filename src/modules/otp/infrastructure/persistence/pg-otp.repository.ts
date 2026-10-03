import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IOtpRepository } from '../../application/ports';
import { EOtpPurpose, Otp } from '../../domain';
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

  async findLatest(
    hashedIdentifier: string,
    purpose: EOtpPurpose,
  ): Promise<Otp | null> {
    // Row lock: concurrent attempts on the same otp must not lose wrongCount increments.
    const row = await this.repository.findOne({
      where: { hashedIdentifier, purpose },
      order: { issuedAt: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? OtpMapper.toDomain(row) : null;
  }

  async save(otp: Otp): Promise<void> {
    await this.repository.save(OtpMapper.toOrm(otp));
  }
}
