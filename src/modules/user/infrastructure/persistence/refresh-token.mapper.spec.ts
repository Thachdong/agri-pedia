import { ERefreshTokenStatus, RefreshToken } from '../../domain';
import { RefreshTokenMapper } from './refresh-token.mapper';

describe('RefreshTokenMapper', () => {
  it('round-trips a freshly issued token', () => {
    const token = RefreshToken.issue({
      hashedToken: 'hash(token)',
      hashedIdentifier: 'hash(a@b.com)',
      ttlSeconds: 3600,
    });

    const restored = RefreshTokenMapper.toDomain(
      RefreshTokenMapper.toOrm(token),
    );

    expect(restored).toEqual(token);
  });

  it('round-trips a rotated token', () => {
    const token = RefreshToken.restore('token-2', {
      familyId: 'family-1',
      hashedToken: 'hash(token-2)',
      hashedIdentifier: 'hash(a@b.com)',
      issuedAt: new Date('2026-01-01T00:00:00Z'),
      expiredAt: new Date('2026-01-31T00:00:00Z'),
      status: ERefreshTokenStatus.ROTATED,
      rotatedFromId: 'token-1',
    });

    const restored = RefreshTokenMapper.toDomain(
      RefreshTokenMapper.toOrm(token),
    );

    expect(restored).toEqual(token);
  });
});
