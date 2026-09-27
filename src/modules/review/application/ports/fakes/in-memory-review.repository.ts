import { EReviewTargetType, Review } from '../../../domain';
import { IReviewRepository } from '../review.repository';

export class InMemoryReviewRepository implements IReviewRepository {
  readonly items = new Map<string, Review>();

  async existsByAuthorAndTarget(
    userId: string,
    targetType: EReviewTargetType,
    targetId: string,
  ): Promise<boolean> {
    return [...this.items.values()].some(
      (review) =>
        review.userId === userId &&
        review.targetType === targetType &&
        review.targetId === targetId,
    );
  }

  async save(review: Review): Promise<void> {
    this.items.set(review.id, review);
  }
}
