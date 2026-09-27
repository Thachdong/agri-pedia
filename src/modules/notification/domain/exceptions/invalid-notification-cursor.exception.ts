import { DomainException, EDomainErrorType } from '@shared/domain';

/** Pagination cursor was not produced by this API (or was altered). */
export class InvalidNotificationCursorException extends DomainException {
  constructor() {
    super(
      'NOTIFICATION_INVALID_CURSOR',
      'Invalid pagination cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
