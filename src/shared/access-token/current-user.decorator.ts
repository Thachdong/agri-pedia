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

/** Payload of the caller's access token, or null for a guest. For handlers behind OptionalAccessTokenGuard. */
export const OptionalCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TAccessTokenPayload | null =>
    context.switchToHttp().getRequest<TAuthenticatedRequest>().auth ?? null,
);
