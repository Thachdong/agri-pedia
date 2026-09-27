import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import { ListMyNotificationsUseCase } from '../../application/use-cases';
import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  ListMyNotificationsQueryDto,
} from './dto';
import { ListMyNotificationsResponse } from './responses/list-my-notifications.response';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly listMyNotifications: ListMyNotificationsUseCase,
  ) {}

  /** The caller's own notifications. */
  @Get()
  @UseGuards(AccessTokenGuard)
  async listMine(
    @CurrentUser() caller: TAccessTokenPayload,
    @Query() query: ListMyNotificationsQueryDto,
  ): Promise<ListMyNotificationsResponse> {
    const { notifications, nextCursor } =
      await this.listMyNotifications.execute({
        userId: caller.userId,
        cursor: query.cursor,
        limit: query.limit ?? DEFAULT_NOTIFICATION_PAGE_SIZE,
      });
    return {
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        label: notification.label,
        content: notification.content,
        isRead: notification.isRead,
        referenceId: notification.referenceId,
        createdAt: notification.createdAt,
      })),
      nextCursor,
    };
  }
}
