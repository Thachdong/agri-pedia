import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidReviewStarException extends DomainException {
  constructor(star: number) {
    super(
      'REVIEW_INVALID_STAR',
      `Star must be an integer from 1 to 5, got ${star}`,
      EDomainErrorType.VALIDATION,
      { star },
    );
  }
}
