import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../ports/notification.repository';

export type TMarkAllNotificationsReadInput = { userId: string };

/** Marks all of the caller's unread notifications as read (no-op when none). */
@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TMarkAllNotificationsReadInput): Promise<void> {
    await this.unitOfWork.runInTransaction(() =>
      this.notifications.markAllReadByUser(input.userId),
    );
  }
}
