import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IRealtimePublisher, REALTIME_PUBLISHER } from '@shared/realtime';
import { ENotificationType, Notification } from '../../domain';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../ports/notification.repository';

/** Realtime event pushed to the recipient's open connections. */
export const NOTIFICATION_CREATED_REALTIME_EVENT = 'notification.created';

/** Same shape as an item of GET /notifications. */
export type TNotificationCreatedRealtimePayload = {
  id: string;
  type: ENotificationType;
  label: string;
  content: string;
  isRead: boolean;
  referenceId: string | null;
  /** ISO 8601. */
  createdAt: string;
};

export type TCreateNotificationInput = {
  /** Recipient. */
  userId: string;
  type: ENotificationType;
  label: string;
  content: string;
  referenceId: string | null;
};
export type TCreateNotificationOutput = { notificationId: string };

/** Stores a new unread notification for a user, then pushes it to them in realtime (best-effort: offline → nothing). */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: IRealtimePublisher,
  ) {}

  async execute(
    input: TCreateNotificationInput,
  ): Promise<TCreateNotificationOutput> {
    const notification = await this.unitOfWork.runInTransaction(async () => {
      const created = Notification.create(input);
      await this.notifications.save(created);
      return created;
    });

    this.realtime.emitToUser(
      notification.userId,
      NOTIFICATION_CREATED_REALTIME_EVENT,
      {
        id: notification.id,
        type: notification.type,
        label: notification.label,
        content: notification.content,
        isRead: notification.isRead,
        referenceId: notification.referenceId,
        createdAt: notification.createdAt.toISOString(),
      } satisfies TNotificationCreatedRealtimePayload,
    );
    return { notificationId: notification.id };
  }
}
