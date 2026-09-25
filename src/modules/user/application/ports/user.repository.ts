import { User } from '../../domain';

export interface IUserRepository {
  existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean>;
  findByHashedIdentifier(hashedIdentifier: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
