import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { NotificationNotFoundException } from '../../domain';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../ports/notification.repository';

export type TMarkNotificationReadInput = {
  userId: string;
  notificationId: string;
};

/** Marks one of the caller's notifications as read (no-op when already read). */
@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TMarkNotificationReadInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const notification = await this.notifications.findByIdAndUser(
        input.notificationId,
        input.userId,
      );
      if (!notification) {
        throw new NotificationNotFoundException(input.notificationId);
      }
      notification.markRead();
      await this.notifications.save(notification);
    });
  }
}
