import { ERefreshTokenStatus } from '../enums/refresh-token-status.enum';
import { InvalidRefreshTokenException } from '../exceptions/invalid-refresh-token.exception';
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

describe('RefreshToken.rotate', () => {
  const issuedAt = new Date('2026-01-01T00:00:00Z');
  const later = new Date('2026-01-02T00:00:00Z');
  const issue = () =>
    RefreshToken.issue({
      hashedToken: 'hash(token-1)',
      hashedIdentifier: 'hash(a@b.com)',
      ttlSeconds: 7 * 24 * 3600,
      now: issuedAt,
    });

  it('marks the token ROTATED and returns an ACTIVE child in the same family', () => {
    const token = issue();

    const child = token.rotate({
      hashedToken: 'hash(token-2)',
      ttlSeconds: 3600,
      now: later,
    });

    expect(token.status).toBe(ERefreshTokenStatus.ROTATED);
    expect(child.id).not.toBe(token.id);
    expect(child.familyId).toBe(token.familyId);
    expect(child.rotatedFromId).toBe(token.id);
    expect(child.hashedToken).toBe('hash(token-2)');
    expect(child.hashedIdentifier).toBe(token.hashedIdentifier);
    expect(child.status).toBe(ERefreshTokenStatus.ACTIVE);
    expect(child.issuedAt).toEqual(later);
    expect(child.expiredAt).toEqual(new Date('2026-01-02T01:00:00Z'));
  });

  it('rejects a token that was already rotated', () => {
    const token = issue();
    token.rotate({
      hashedToken: 'hash(token-2)',
      ttlSeconds: 3600,
      now: later,
    });

    expect(() =>
      token.rotate({
        hashedToken: 'hash(token-3)',
        ttlSeconds: 3600,
        now: later,
      }),
    ).toThrow(InvalidRefreshTokenException);
  });

  it('rejects a revoked token', () => {
    const token = RefreshToken.restore('token-1', {
      familyId: 'family-1',
      hashedToken: 'hash(token-1)',
      hashedIdentifier: 'hash(a@b.com)',
      issuedAt,
      expiredAt: new Date('2026-02-01T00:00:00Z'),
      status: ERefreshTokenStatus.REVOKED,
      rotatedFromId: null,
    });

    expect(() =>
      token.rotate({
        hashedToken: 'hash(token-2)',
        ttlSeconds: 3600,
        now: later,
      }),
    ).toThrow(InvalidRefreshTokenException);
  });

  it('rejects an expired token and leaves it ACTIVE', () => {
    const token = issue();

    expect(() =>
      token.rotate({
        hashedToken: 'hash(token-2)',
        ttlSeconds: 3600,
        now: new Date('2026-01-08T00:00:00Z'),
      }),
    ).toThrow(InvalidRefreshTokenException);
    expect(token.status).toBe(ERefreshTokenStatus.ACTIVE);
  });
});

describe('RefreshToken expiry and age', () => {
  const token = RefreshToken.issue({
    hashedToken: 'hash(token)',
    hashedIdentifier: 'hash(a@b.com)',
    ttlSeconds: 60,
    now: new Date('2026-01-01T00:00:00Z'),
  });

  it('expires at expiredAt', () => {
    expect(token.isExpired(new Date('2026-01-01T00:00:59Z'))).toBe(false);
    expect(token.isExpired(new Date('2026-01-01T00:01:00Z'))).toBe(true);
  });

  it('tells whether it was issued within a window', () => {
    expect(token.isIssuedWithin(30, new Date('2026-01-01T00:00:30Z'))).toBe(
      true,
    );
    expect(token.isIssuedWithin(30, new Date('2026-01-01T00:00:31Z'))).toBe(
      false,
    );
  });
});
