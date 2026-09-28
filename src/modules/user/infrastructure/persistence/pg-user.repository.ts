import { Injectable } from '@nestjs/common';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IUserRepository } from '../../application/ports';
import { User, UserIdentifierAlreadyUsedException } from '../../domain';
import { UserMapper } from './user.mapper';
import { UserOrmEntity } from './user.orm-entity';

const PG_UNIQUE_VIOLATION = '23505';
const HASHED_IDENTIFIER_CONSTRAINT = 'UQ_users_hashed_identifier';

@Injectable()
export class PgUserRepository
  extends TypeOrmRepositoryBase<UserOrmEntity>
  implements IUserRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, UserOrmEntity);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.repository.findBy({ id: In(ids) });
    return rows.map((row) => UserMapper.toDomain(row));
  }

  async existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean> {
    return this.repository.existsBy({ hashedIdentifier });
  }

  async findByHashedIdentifier(hashedIdentifier: string): Promise<User | null> {
    const row = await this.repository.findOneBy({ hashedIdentifier });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    try {
      await this.repository.save(UserMapper.toOrm(user));
    } catch (error) {
      // Concurrent registration with the same identifier passes the exists-check; the index catches it.
      if (isUniqueViolation(error, HASHED_IDENTIFIER_CONSTRAINT)) {
        throw new UserIdentifierAlreadyUsedException();
      }
      throw error;
    }
  }
}

const isUniqueViolation = (error: unknown, constraint: string): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === PG_UNIQUE_VIOLATION &&
    driverError.constraint === constraint
  );
};
