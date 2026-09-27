import { Notification } from '../../domain';

/** Position after which the next page starts (the last item of the previous page). */
export type TNotificationPageKey = { createdAt: Date; id: string };

export type TNotificationPageQuery = {
  after?: TNotificationPageKey;
  limit: number;
};

export interface INotificationRepository {
  /** Null when missing or addressed to another user. */
  findByIdAndUser(id: string, userId: string): Promise<Notification | null>;
  /** Notifications of the recipient, newest first (createdAt desc, id desc). */
  findByUser(
    userId: string,
    query: TNotificationPageQuery,
  ): Promise<Notification[]>;
  /** Marks every unread notification of the recipient as read, in one write. */
  markAllReadByUser(userId: string): Promise<void>;
  save(notification: Notification): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
