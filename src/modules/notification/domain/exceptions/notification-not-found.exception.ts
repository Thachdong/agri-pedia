import { DomainException, EDomainErrorType } from '@shared/domain';

/** No such notification for this user (someone else's counts as missing). */
export class NotificationNotFoundException extends DomainException {
  constructor(notificationId: string) {
    super(
      'NOTIFICATION_NOT_FOUND',
      `Notification ${notificationId} not found`,
      EDomainErrorType.NOT_FOUND,
      { notificationId },
    );
  }
}
