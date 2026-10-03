import { DomainException, EDomainErrorType } from '@shared/domain';
import { EReviewTargetType } from '../enums/review-target-type.enum';

export class ReviewTargetNotFoundException extends DomainException {
  constructor(targetType: EReviewTargetType, targetId: string) {
    super(
      'REVIEW_TARGET_NOT_FOUND',
      `${targetType} ${targetId} not found`,
      EDomainErrorType.NOT_FOUND,
      { targetType, targetId },
    );
  }
}
