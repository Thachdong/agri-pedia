import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  GetMessageDiagnosisReportUseCase,
  ListMyChatRoomsUseCase,
  ListRoomMessagesUseCase,
} from '../../application/use-cases';
import {
  DEFAULT_CHAT_MESSAGE_PAGE_SIZE,
  DEFAULT_CHAT_ROOM_PAGE_SIZE,
  ListMyChatRoomsQueryDto,
  ListRoomMessagesQueryDto,
} from './dto';
import { ListMyChatRoomsResponse } from './responses/list-my-chat-rooms.response';
import { ListRoomMessagesResponse } from './responses/list-room-messages.response';
import { MessageDiagnosisReportResponse } from './responses/message-diagnosis-report.response';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly listMyChatRooms: ListMyChatRoomsUseCase,
    private readonly listRoomMessages: ListRoomMessagesUseCase,
    private readonly getMessageDiagnosisReport: GetMessageDiagnosisReportUseCase,
  ) {}

  /** The caller's chat rooms, most recent message first, with unread counts. */
  @Get('rooms')
  @UseGuards(AccessTokenGuard)
  async listMyRooms(
    @CurrentUser() caller: TAccessTokenPayload,
    @Query() query: ListMyChatRoomsQueryDto,
  ): Promise<ListMyChatRoomsResponse> {
    const { totalUnread, rooms, nextCursor } =
      await this.listMyChatRooms.execute({
        userId: caller.userId,
        cursor: query.cursor,
        limit: query.limit ?? DEFAULT_CHAT_ROOM_PAGE_SIZE,
      });
    return {
      totalUnread,
      rooms: rooms.map((room) => ({
        roomId: room.roomId,
        otherUserId: room.otherUserId,
        otherUsername: room.otherUsername,
        otherUserAvatar: room.otherUserAvatar,
        lastMessage: room.lastMessage && {
          messageId: room.lastMessage.messageId,
          senderId: room.lastMessage.senderId,
          message: room.lastMessage.message,
          type: room.lastMessage.type,
          diagnosisId: room.lastMessage.diagnosisId,
        },
        lastMessageAt: room.lastMessageAt,
        unreadCount: room.unreadCount,
      })),
      nextCursor,
    };
  }

  /** Messages of a room the caller is a member of, newest first. */
  @Get('rooms/:roomId/messages')
  @UseGuards(AccessTokenGuard)
  async listMessages(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListRoomMessagesQueryDto,
  ): Promise<ListRoomMessagesResponse> {
    const { messages, nextCursor } = await this.listRoomMessages.execute({
      userId: caller.userId,
      roomId,
      cursor: query.cursor,
      limit: query.limit ?? DEFAULT_CHAT_MESSAGE_PAGE_SIZE,
    });
    return {
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        senderUsername: message.senderUsername,
        senderAvatar: message.senderAvatar,
        message: message.message,
        type: message.type,
        diagnosisId: message.diagnosisId,
        createdAt: message.createdAt,
      })),
      nextCursor,
    };
  }

  /** The diagnosis shared by a DIAGNOSIS_REPORT message, for either member of the room. */
  @Get('rooms/:roomId/messages/:messageId/diagnosis')
  @UseGuards(AccessTokenGuard)
  async messageDiagnosis(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<MessageDiagnosisReportResponse> {
    return this.getMessageDiagnosisReport.execute({
      userId: caller.userId,
      roomId,
      messageId,
    });
  }
}
