import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AccessTokenGuard,
  CurrentUser,
  TAccessTokenPayload,
} from '@shared/access-token';
import {
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from '../../application/use-cases';
import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  ListMyNotificationsQueryDto,
} from './dto';
import { ListMyNotificationsResponse } from './responses/list-my-notifications.response';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly listMyNotifications: ListMyNotificationsUseCase,
    private readonly markNotificationRead: MarkNotificationReadUseCase,
    private readonly markAllNotificationsRead: MarkAllNotificationsReadUseCase,
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

  @Patch('read-all')
  @UseGuards(AccessTokenGuard)
  async markAllRead(@CurrentUser() caller: TAccessTokenPayload): Promise<null> {
    await this.markAllNotificationsRead.execute({ userId: caller.userId });
    return null;
  }

  @Patch(':notificationId/read')
  @UseGuards(AccessTokenGuard)
  async markRead(
    @CurrentUser() caller: TAccessTokenPayload,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<null> {
    await this.markNotificationRead.execute({
      userId: caller.userId,
      notificationId,
    });
    return null;
  }
}
