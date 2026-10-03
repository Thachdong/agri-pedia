import { ENotificationType } from '../../../domain';

export class NotificationResponse {
  id: string;
  type: ENotificationType;
  label: string;
  content: string;
  isRead: boolean;
  /** Id of the thing the notification is about (review id for REVIEW); null when none. */
  referenceId: string | null;
  createdAt: Date;
}

export class ListMyNotificationsResponse {
  /** Newest first. */
  notifications: NotificationResponse[];
  /** Pass as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
}
