import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IRefreshTokenRepository } from '../../application/ports';
import { RefreshToken } from '../../domain';
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

  async save(token: RefreshToken): Promise<void> {
    await this.repository.save(RefreshTokenMapper.toOrm(token));
  }
}
