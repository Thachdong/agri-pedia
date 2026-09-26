import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenGuard, TAuthenticatedRequest } from './access-token.guard';
import { InMemoryAccessTokenService } from './in-memory.access-token';
import { InvalidAccessTokenException } from './invalid-access-token.exception';
import { JwtAccessTokenService } from './jwt.access-token';

describe('JwtAccessTokenService', () => {
  const secret = 'x'.repeat(32);
  const jwt = new JwtService({
    secret,
    signOptions: { algorithm: 'HS256', expiresIn: 900 },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const service = new JwtAccessTokenService(jwt);

  it('signs the user id as subject with an expiry', async () => {
    const token = await service.sign({ userId: 'user-1' });
    const claims = await jwt.verifyAsync<{
      sub: string;
      iat: number;
      exp: number;
    }>(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.exp - claims.iat).toBe(900);
  });

  it('verifies a token it signed', async () => {
    const token = await service.sign({ userId: 'user-1' });
    await expect(service.verify(token)).resolves.toEqual({ userId: 'user-1' });
  });

  it('rejects malformed, foreign and expired tokens', async () => {
    const foreign = new JwtService({ secret: 'y'.repeat(32) });
    const expired = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: -1 });

    await expect(service.verify('not-a-jwt')).resolves.toBeNull();
    await expect(
      service.verify(await foreign.signAsync({ sub: 'user-1' })),
    ).resolves.toBeNull();
    await expect(service.verify(expired)).resolves.toBeNull();
  });

  it('rejects a token without a string subject', async () => {
    await expect(
      service.verify(await jwt.signAsync({ foo: 'bar' })),
    ).resolves.toBeNull();
  });
});

describe('AccessTokenGuard', () => {
  const guard = new AccessTokenGuard(new InMemoryAccessTokenService());
  const contextFor = (request: TAuthenticatedRequest) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('accepts a valid bearer token and exposes its payload', async () => {
    const request: TAuthenticatedRequest = {
      headers: { authorization: 'Bearer access(user-1)' },
    };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.auth).toEqual({ userId: 'user-1' });
  });

  it.each([undefined, '', 'access(user-1)', 'Basic abc', 'Bearer garbage'])(
    'rejects authorization header %p',
    async (authorization) => {
      await expect(
        guard.canActivate(contextFor({ headers: { authorization } })),
      ).rejects.toThrow(InvalidAccessTokenException);
    },
  );
});
