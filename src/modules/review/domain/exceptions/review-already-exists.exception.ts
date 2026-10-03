import { DomainException, EDomainErrorType } from '@shared/domain';
import { EReviewTargetType } from '../enums/review-target-type.enum';

/** A user reviews each target at most once. */
export class ReviewAlreadyExistsException extends DomainException {
  constructor(targetType: EReviewTargetType, targetId: string) {
    super(
      'REVIEW_ALREADY_EXISTS',
      `${targetType} ${targetId} was already reviewed by this user`,
      EDomainErrorType.CONFLICT,
      { targetType, targetId },
    );
  }
}
