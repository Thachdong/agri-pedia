import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only an ACTIVE FARMER may write reviews. */
export class ReviewReviewerNotAllowedException extends DomainException {
  constructor(userId: string) {
    super(
      'REVIEW_REVIEWER_NOT_ALLOWED',
      `User ${userId} is not an active farmer`,
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
