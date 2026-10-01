import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

/** Id of the connection that sent the message (for IRealtimeChannels). Only in @RealtimeGateway() handlers. */
export const SocketConnectionId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToWs().getClient<Socket>().id,
);
