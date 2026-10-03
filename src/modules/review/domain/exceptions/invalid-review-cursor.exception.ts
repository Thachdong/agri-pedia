import { DomainException, EDomainErrorType } from '@shared/domain';

/** Pagination cursor was not produced by this API (or was altered). */
export class InvalidReviewCursorException extends DomainException {
  constructor() {
    super(
      'REVIEW_INVALID_CURSOR',
      'Invalid pagination cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
