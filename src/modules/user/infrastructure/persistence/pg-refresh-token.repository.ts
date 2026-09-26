import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IRefreshTokenRepository } from '../../application/ports';
import { ERefreshTokenStatus, RefreshToken } from '../../domain';
import { RefreshTokenMapper } from './refresh-token.mapper';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

@Injectable()
export class PgRefreshTokenRepository
  extends TypeOrmRepositoryBase<RefreshTokenOrmEntity>
  implements IRefreshTokenRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, RefreshTokenOrmEntity);
  }

  /** SELECT ... FOR UPDATE: must run inside an IUnitOfWork transaction. */
  async findByHashedTokenForUpdate(
    hashedToken: string,
  ): Promise<RefreshToken | null> {
    const row = await this.repository.findOne({
      where: { hashedToken },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async findByRotatedFromId(parentId: string): Promise<RefreshToken | null> {
    const row = await this.repository.findOneBy({ rotatedFromId: parentId });
    return row ? RefreshTokenMapper.toDomain(row) : null;
  }

  async save(token: RefreshToken): Promise<void> {
    await this.repository.save(RefreshTokenMapper.toOrm(token));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.repository.update(
      { familyId },
      { status: ERefreshTokenStatus.REVOKED },
    );
  }
}
