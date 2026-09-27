import { ENotificationType, Notification } from '../../domain';
import { NotificationOrmEntity } from './notification.orm-entity';

export class NotificationMapper {
  static toDomain(row: NotificationOrmEntity): Notification {
    return Notification.restore(row.id, {
      userId: row.userId,
      type: row.type as ENotificationType,
      label: row.label,
      content: row.content,
      referenceId: row.referenceId,
      isRead: row.isRead,
      createdAt: row.createdAt,
    });
  }

  static toOrm(notification: Notification): NotificationOrmEntity {
    return Object.assign(new NotificationOrmEntity(), {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      label: notification.label,
      content: notification.content,
      referenceId: notification.referenceId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });
  }
}
