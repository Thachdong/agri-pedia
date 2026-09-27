import { Notification } from '../../domain';

/** Position after which the next page starts (the last item of the previous page). */
export type TNotificationPageKey = { createdAt: Date; id: string };

export type TNotificationPageQuery = {
  after?: TNotificationPageKey;
  limit: number;
};

export interface INotificationRepository {
  /** Notifications of the recipient, newest first (createdAt desc, id desc). */
  findByUser(
    userId: string,
    query: TNotificationPageQuery,
  ): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
