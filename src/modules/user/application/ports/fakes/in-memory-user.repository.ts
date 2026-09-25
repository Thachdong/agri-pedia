import { User } from '../../../domain';
import { IUserRepository } from '../user.repository';

export class InMemoryUserRepository implements IUserRepository {
  readonly items = new Map<string, User>();

  async existsByHashedIdentifier(hashedIdentifier: string): Promise<boolean> {
    return [...this.items.values()].some(
      (user) => user.hashedIdentifier === hashedIdentifier,
    );
  }

  async findByHashedIdentifier(hashedIdentifier: string): Promise<User | null> {
    return (
      [...this.items.values()].find(
        (user) => user.hashedIdentifier === hashedIdentifier,
      ) ?? null
    );
  }

  async save(user: User): Promise<void> {
    this.items.set(user.id, user);
  }
}
