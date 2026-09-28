import { User } from '../../domain';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** Unknown ids are left out; no order. */
  findByIds(ids: string[]): Promise<User[]>;
  existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean>;
  findByHashedIdentifier(hashedIdentifier: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
