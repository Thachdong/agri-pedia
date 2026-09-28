import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ENotificationType, Notification } from '../../domain';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../ports/notification.repository';

export type TCreateNotificationInput = {
  /** Recipient. */
  userId: string;
  type: ENotificationType;
  label: string;
  content: string;
  referenceId: string | null;
};
export type TCreateNotificationOutput = { notificationId: string };

/** Stores a new unread notification for a user. */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notifications: INotificationRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TCreateNotificationInput,
  ): Promise<TCreateNotificationOutput> {
    const notification = await this.unitOfWork.runInTransaction(async () => {
      const created = Notification.create(input);
      await this.notifications.save(created);
      return created;
    });
    return { notificationId: notification.id };
  }
}
