import { DomainException, EDomainErrorType } from '@shared/domain';

export class ReviewNotFoundException extends DomainException {
  constructor(reviewId: string) {
    super(
      'REVIEW_NOT_FOUND',
      `Review ${reviewId} not found`,
      EDomainErrorType.NOT_FOUND,
      { reviewId },
    );
  }
}
