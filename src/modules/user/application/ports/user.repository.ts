import { User } from '../../domain';

export interface IUserRepository {
  existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
