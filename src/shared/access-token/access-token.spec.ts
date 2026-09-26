import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenService } from './jwt.access-token';

describe('JwtAccessTokenService', () => {
  const secret = 'x'.repeat(32);
  const jwt = new JwtService({ secret, signOptions: { expiresIn: 900 } });
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
});
