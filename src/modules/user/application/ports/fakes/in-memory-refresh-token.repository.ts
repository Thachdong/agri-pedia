import { RefreshToken } from '../../../domain';
import { IRefreshTokenRepository } from '../refresh-token.repository';

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  readonly items = new Map<string, RefreshToken>();

  async save(token: RefreshToken): Promise<void> {
    this.items.set(token.id, token);
  }
}
