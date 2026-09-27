import { Notification } from '../../../domain';
import { INotificationRepository } from '../notification.repository';

export class InMemoryNotificationRepository implements INotificationRepository {
  readonly items = new Map<string, Notification>();

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id, notification);
  }
}
