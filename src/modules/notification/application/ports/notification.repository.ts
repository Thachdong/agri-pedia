import { Notification } from '../../domain';

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
