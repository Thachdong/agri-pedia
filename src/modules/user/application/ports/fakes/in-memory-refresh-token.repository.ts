import { ERefreshTokenStatus, RefreshToken } from '../../../domain';
import { IRefreshTokenRepository } from '../refresh-token.repository';

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  readonly items = new Map<string, RefreshToken>();

  async findByHashedTokenForUpdate(
    hashedToken: string,
  ): Promise<RefreshToken | null> {
    return this.find((token) => token.hashedToken === hashedToken);
  }

  async findByRotatedFromId(parentId: string): Promise<RefreshToken | null> {
    return this.find((token) => token.rotatedFromId === parentId);
  }

  async save(token: RefreshToken): Promise<void> {
    this.items.set(token.id, token);
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const [id, token] of this.items) {
      if (token.familyId === familyId) {
        this.items.set(
          id,
          RefreshToken.restore(id, {
            familyId: token.familyId,
            hashedToken: token.hashedToken,
            hashedIdentifier: token.hashedIdentifier,
            issuedAt: token.issuedAt,
            expiredAt: token.expiredAt,
            status: ERefreshTokenStatus.REVOKED,
            rotatedFromId: token.rotatedFromId,
          }),
        );
      }
    }
  }

  private find(
    predicate: (token: RefreshToken) => boolean,
  ): RefreshToken | null {
    return [...this.items.values()].find(predicate) ?? null;
  }
}
