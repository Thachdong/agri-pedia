import { EReviewTargetType, Review } from '../../../domain';
import {
  IReviewRepository,
  TReviewPageQuery,
  TReviewStarCounts,
  TReviewTargets,
} from '../review.repository';

const newestFirst = (a: Review, b: Review) =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

const isOfTargets = (review: Review, targets: TReviewTargets) =>
  review.targetType === EReviewTargetType.USER
    ? review.targetId === targets.userId
    : targets.productIds.includes(review.targetId);

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

  async findByTargets(
    targets: TReviewTargets,
    { targetType, star, after, limit }: TReviewPageQuery,
  ): Promise<Review[]> {
    return [...this.items.values()]
      .filter(
        (review) =>
          isOfTargets(review, targets) &&
          (targetType === undefined || review.targetType === targetType) &&
          (star === undefined || review.star === star),
      )
      .sort(newestFirst)
      .filter(
        (review) =>
          !after ||
          review.createdAt.getTime() < after.createdAt.getTime() ||
          (review.createdAt.getTime() === after.createdAt.getTime() &&
            review.id < after.id),
      )
      .slice(0, limit);
  }

  async summarizeByTargets(
    targets: TReviewTargets,
  ): Promise<TReviewStarCounts> {
    const counts: TReviewStarCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    [...this.items.values()]
      .filter((review) => isOfTargets(review, targets))
      .forEach((review) => {
        counts[review.star as keyof TReviewStarCounts] += 1;
      });
    return counts;
  }

  async save(review: Review): Promise<void> {
    this.items.set(review.id, review);
  }
}
