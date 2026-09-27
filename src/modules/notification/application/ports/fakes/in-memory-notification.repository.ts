import { Notification } from '../../../domain';
import {
  INotificationRepository,
  TNotificationPageQuery,
} from '../notification.repository';

const newestFirst = (a: Notification, b: Notification) =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

export class InMemoryNotificationRepository implements INotificationRepository {
  readonly items = new Map<string, Notification>();

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<Notification | null> {
    const notification = this.items.get(id);
    return notification?.userId === userId ? notification : null;
  }

  async findByUser(
    userId: string,
    { after, limit }: TNotificationPageQuery,
  ): Promise<Notification[]> {
    return [...this.items.values()]
      .filter((notification) => notification.userId === userId)
      .sort(newestFirst)
      .filter(
        (notification) =>
          !after ||
          notification.createdAt.getTime() < after.createdAt.getTime() ||
          (notification.createdAt.getTime() === after.createdAt.getTime() &&
            notification.id < after.id),
      )
      .slice(0, limit);
  }

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id, notification);
  }
}
