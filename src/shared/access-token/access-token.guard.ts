import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
  TAccessTokenPayload,
} from './access-token.interface';
import { InvalidAccessTokenException } from './invalid-access-token.exception';

export type TAuthenticatedRequest = {
  headers: { authorization?: string };
  auth?: TAccessTokenPayload;
};

const BEARER = /^Bearer\s+(\S+)$/i;

/** Requires `Authorization: Bearer <accessToken>`; exposes the payload through @CurrentUser(). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: IAccessTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TAuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    const payload = token ? await this.accessTokens.verify(token) : null;
    if (!payload) {
      throw new InvalidAccessTokenException();
    }
    request.auth = payload;
    return true;
  }
}

/**
 * Like AccessTokenGuard, but a request without an Authorization header passes as a guest
 * (read the caller with @OptionalCurrentUser()). A header that is present must hold a valid token.
 */
@Injectable()
export class OptionalAccessTokenGuard extends AccessTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TAuthenticatedRequest>();
    if (request.headers.authorization === undefined) {
      return true;
    }
    return super.canActivate(context);
  }
}
