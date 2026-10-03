import { DomainException, EDomainErrorType } from '@shared/domain';
import { EReviewTargetType } from '../enums/review-target-type.enum';

/** Target exists but cannot be reviewed: user is not an active distributor, or product is not ACTIVE. */
export class InvalidReviewTargetException extends DomainException {
  constructor(targetType: EReviewTargetType, targetId: string) {
    super(
      'REVIEW_INVALID_TARGET',
      `${targetType} ${targetId} cannot be reviewed`,
      EDomainErrorType.BUSINESS_RULE,
      { targetType, targetId },
    );
  }
}
