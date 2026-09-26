import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TAccessTokenPayload } from './access-token.interface';
import { TAuthenticatedRequest } from './access-token.guard';

/** Payload of the caller's access token. Only on handlers behind AccessTokenGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TAccessTokenPayload => {
    const { auth } = context.switchToHttp().getRequest<TAuthenticatedRequest>();
    if (!auth) {
      throw new Error('@CurrentUser() used without AccessTokenGuard');
    }
    return auth;
  },
);
