import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import { ListMyChatRoomsUseCase } from '../../application/use-cases';
import { DEFAULT_CHAT_ROOM_PAGE_SIZE, ListMyChatRoomsQueryDto } from './dto';
import { ListMyChatRoomsResponse } from './responses/list-my-chat-rooms.response';

@Controller('chat')
export class ChatController {
  constructor(private readonly listMyChatRooms: ListMyChatRoomsUseCase) {}

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
        lastMessage: room.lastMessage && {
          messageId: room.lastMessage.messageId,
          senderId: room.lastMessage.senderId,
          message: room.lastMessage.message,
        },
        lastMessageAt: room.lastMessageAt,
        unreadCount: room.unreadCount,
      })),
      nextCursor,
    };
  }
}
