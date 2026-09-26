import { RefreshToken } from '../../domain';

export interface IRefreshTokenRepository {
  /** Locks the token until the surrounding transaction ends, so one token is never rotated twice. */
  findByHashedTokenForUpdate(hashedToken: string): Promise<RefreshToken | null>;
  /** The token that replaced `parentId` on rotation. */
  findByRotatedFromId(parentId: string): Promise<RefreshToken | null>;
  save(token: RefreshToken): Promise<void>;
  /** Marks every token of the family REVOKED. */
  revokeFamily(familyId: string): Promise<void>;
  /** Marks every token of the owner REVOKED (all sessions end). */
  revokeAllByHashedIdentifier(hashedIdentifier: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');
