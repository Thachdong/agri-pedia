import { EReviewTargetType, Review } from '../../domain';

export interface IReviewRepository {
  /** True when `userId` already reviewed this target. */
  existsByAuthorAndTarget(
    userId: string,
    targetType: EReviewTargetType,
    targetId: string,
  ): Promise<boolean>;
  save(review: Review): Promise<void>;
}

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');
