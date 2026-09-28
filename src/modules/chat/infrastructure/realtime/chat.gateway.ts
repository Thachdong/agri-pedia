import { MessageBody, SubscribeMessage } from '@nestjs/websockets';
import { TAccessTokenPayload } from '@shared/access-token';
import {
  RealtimeGateway,
  SocketConnectionId,
  SocketUser,
} from '@shared/realtime';
import {
  EnterChatRoomUseCase,
  LeaveChatRoomUseCase,
  SendChatMessageUseCase,
} from '../../application/use-cases';
import { ChatRoomRefDto, SendChatMessageDto } from './dto';
import { ChatRoomAckResponse } from './responses/chat-room-ack.response';
import { SendChatMessageResponse } from './responses/send-chat-message.response';

/**
 * Socket.io chat events (default namespace, same port as HTTP).
 *
 * Connect: `io(url, { auth: { token: <accessToken> } })` — invalid token → `connect_error` "AUTH_INVALID_ACCESS_TOKEN".
 * Every client → server event takes an ack; errors come back as `{ error: { code, message, details? } }`
 * (REALTIME_VALIDATION_FAILED for a malformed payload).
 *
 * `chat.message.send` `{ roomId?, receiverId?, message }` → `{ messageId, roomId, createdAt }`
 *   errors: CHAT_ROOM_OR_RECEIVER_REQUIRED, CHAT_SENDER_NOT_ALLOWED, CHAT_ROOM_NOT_FOUND, CHAT_NOT_ROOM_MEMBER,
 *           CHAT_RECEIVER_NOT_FOUND, CHAT_INVALID_RECEIVER, CHAT_INVALID_MESSAGE
 * `chat.room.enter` `{ roomId }` → `{ roomId }` — chat window opened: all messages read, and messages arriving
 *   while it stays open are read on arrival. errors: CHAT_ROOM_NOT_FOUND, CHAT_NOT_ROOM_MEMBER
 * `chat.room.leave` `{ roomId }` → `{ roomId }` — chat window closed: new messages count as unread again.
 *   Disconnecting leaves every room.
 *
 * Server → other room member `chat.message.received` `{ messageId, roomId, senderId, message, createdAt }`.
 */
@RealtimeGateway()
export class ChatGateway {
  constructor(
    private readonly sendChatMessage: SendChatMessageUseCase,
    private readonly enterChatRoom: EnterChatRoomUseCase,
    private readonly leaveChatRoom: LeaveChatRoomUseCase,
  ) {}

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

  @SubscribeMessage('chat.room.enter')
  async enter(
    @SocketUser() user: TAccessTokenPayload,
    @SocketConnectionId() connectionId: string,
    @MessageBody() dto: ChatRoomRefDto,
  ): Promise<ChatRoomAckResponse> {
    await this.enterChatRoom.execute({
      userId: user.userId,
      roomId: dto.roomId,
      connectionId,
    });
    return { roomId: dto.roomId };
  }

  @SubscribeMessage('chat.room.leave')
  async leave(
    @SocketConnectionId() connectionId: string,
    @MessageBody() dto: ChatRoomRefDto,
  ): Promise<ChatRoomAckResponse> {
    await this.leaveChatRoom.execute({ roomId: dto.roomId, connectionId });
    return { roomId: dto.roomId };
  }
}
