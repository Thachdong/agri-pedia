import { ERefreshTokenStatus, RefreshToken } from '../../domain';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

export class RefreshTokenMapper {
  static toDomain(row: RefreshTokenOrmEntity): RefreshToken {
    return RefreshToken.restore(row.id, {
      familyId: row.familyId,
      hashedToken: row.hashedToken,
      hashedIdentifier: row.hashedIdentifier,
      issuedAt: row.issuedAt,
      expiredAt: row.expiredAt,
      status: row.status as ERefreshTokenStatus,
      rotatedFromId: row.rotatedFromId,
    });
  }

  static toOrm(token: RefreshToken): RefreshTokenOrmEntity {
    return Object.assign(new RefreshTokenOrmEntity(), {
      id: token.id,
      familyId: token.familyId,
      hashedToken: token.hashedToken,
      hashedIdentifier: token.hashedIdentifier,
      issuedAt: token.issuedAt,
      expiredAt: token.expiredAt,
      status: token.status,
      rotatedFromId: token.rotatedFromId,
    });
  }
}
