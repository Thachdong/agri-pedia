import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { TAccessTokenPayload } from '@shared/access-token';
import { TAuthenticatedSocketData } from './socket-io.realtime';

/** Payload of the access token the socket connected with. Only in @RealtimeGateway() handlers. */
export const SocketUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TAccessTokenPayload => {
    const { auth } = context.switchToWs().getClient<Socket>()
      .data as TAuthenticatedSocketData;
    if (!auth) {
      throw new Error('@SocketUser() used on an unauthenticated socket');
    }
    return auth;
  },
);
