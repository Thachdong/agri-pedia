import { ERefreshTokenStatus } from '../enums/refresh-token-status.enum';
import { RefreshToken } from './refresh-token.entity';

describe('RefreshToken.issue', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const input = {
    hashedToken: 'hash(token)',
    hashedIdentifier: 'hash(a@b.com)',
    ttlSeconds: 3600,
    now,
  };

  it('issues an ACTIVE token starting a new family', () => {
    const token = RefreshToken.issue(input);
    expect(token.id).toEqual(expect.any(String));
    expect(token.familyId).toEqual(expect.any(String));
    expect(token.familyId).not.toBe(token.id);
    expect(token.hashedToken).toBe('hash(token)');
    expect(token.hashedIdentifier).toBe('hash(a@b.com)');
    expect(token.status).toBe(ERefreshTokenStatus.ACTIVE);
    expect(token.rotatedFromId).toBeNull();
    expect(token.issuedAt).toEqual(now);
    expect(token.expiredAt).toEqual(new Date('2026-01-01T01:00:00Z'));
  });

  it('starts a different family on each login', () => {
    expect(RefreshToken.issue(input).familyId).not.toBe(
      RefreshToken.issue(input).familyId,
    );
  });
});
