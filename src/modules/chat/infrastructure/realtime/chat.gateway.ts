import { MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { TAccessTokenPayload } from '@shared/access-token';
import { RealtimeGateway, SocketUser } from '@shared/realtime';
import { SendChatMessageUseCase } from '../../application/use-cases';
import { SendChatMessageDto } from './dto';
import { SendChatMessageResponse } from './responses/send-chat-message.response';

/**
 * Socket.io chat events (default namespace, same port as HTTP).
 *
 * Connect: `io(url, { auth: { token: <accessToken> } })` — invalid token → `connect_error` "AUTH_INVALID_ACCESS_TOKEN".
 *
 * Client → server `chat.message.send` `{ roomId?, receiverId?, message }`, with ack:
 *   - ok:    `{ messageId, roomId, createdAt }`
 *   - error: `{ error: { code, message, details? } }` — REALTIME_VALIDATION_FAILED, CHAT_ROOM_OR_RECEIVER_REQUIRED,
 *            CHAT_SENDER_NOT_ALLOWED, CHAT_ROOM_NOT_FOUND, CHAT_NOT_ROOM_MEMBER, CHAT_RECEIVER_NOT_FOUND,
 *            CHAT_INVALID_RECEIVER, CHAT_INVALID_MESSAGE
 *
 * Server → other room member `chat.message.received` `{ messageId, roomId, senderId, message, createdAt }`.
 */
@RealtimeGateway()
export class ChatGateway {
  constructor(private readonly sendChatMessage: SendChatMessageUseCase) {}

  @SubscribeMessage('chat.message.send')
  async send(
    @SocketUser() user: TAccessTokenPayload,
    @MessageBody() dto: SendChatMessageDto,
  ): Promise<SendChatMessageResponse> {
    return this.sendChatMessage.execute({
      senderId: user.userId,
      roomId: dto.roomId,
      receiverId: dto.receiverId,
      message: dto.message,
    });
  }
}
