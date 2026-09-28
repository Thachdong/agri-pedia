import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only the author of a review may change it. */
export class ReviewNotOwnerException extends DomainException {
  constructor(reviewId: string, userId: string) {
    super(
      'REVIEW_NOT_OWNER',
      `User ${userId} does not own review ${reviewId}`,
      EDomainErrorType.FORBIDDEN,
      { reviewId, userId },
    );
  }
}
