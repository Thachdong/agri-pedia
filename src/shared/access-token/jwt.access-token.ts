import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  IAccessTokenService,
  TAccessTokenPayload,
} from './access-token.interface';

/** JWT (HS256) implementation; secret and TTL come from the `auth` config group. */
@Injectable()
export class JwtAccessTokenService implements IAccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: TAccessTokenPayload): Promise<string> {
    return this.jwt.signAsync({ sub: payload.userId });
  }

  async verify(token: string): Promise<TAccessTokenPayload | null> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
      return typeof claims.sub === 'string' ? { userId: claims.sub } : null;
    } catch {
      // malformed, bad signature or expired
      return null;
    }
  }
}
