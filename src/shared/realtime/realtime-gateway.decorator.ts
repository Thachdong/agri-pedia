import {
  applyDecorators,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { RealtimeExceptionFilter } from './realtime-exception.filter';

/**
 * Marks an inbound realtime adapter. Shares the authenticated socket.io server,
 * validates message DTOs like HTTP, and answers errors through the ack.
 * Handlers use @SubscribeMessage / @MessageBody from @nestjs/websockets and @SocketUser().
 */
export const RealtimeGateway = (): ClassDecorator =>
  applyDecorators(
    WebSocketGateway(),
    UseFilters(RealtimeExceptionFilter),
    UsePipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    ),
  );
