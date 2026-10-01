import { EReviewTargetType, Review } from '../../domain';
import { InMemoryReviewRepository } from '../ports/fakes';
import { GetReviewSummaryUseCase } from './get-review-summary.use-case';

const reviewOf = (
  targetType: EReviewTargetType,
  targetId: string,
  star: number,
): Review =>
  Review.restore(crypto.randomUUID(), {
    userId: crypto.randomUUID(),
    targetType,
    targetId,
    content: 'ok',
    star,
    createdAt: new Date(Date.UTC(2026, 0, 1)),
  });

describe('GetReviewSummaryUseCase', () => {
  let reviews: InMemoryReviewRepository;
  let useCase: GetReviewSummaryUseCase;

  beforeEach(async () => {
    reviews = new InMemoryReviewRepository();
    useCase = new GetReviewSummaryUseCase(reviews);
    for (const review of [
      reviewOf(EReviewTargetType.PRODUCT, 'p1', 5),
      reviewOf(EReviewTargetType.PRODUCT, 'p1', 5),
      reviewOf(EReviewTargetType.PRODUCT, 'p1', 4),
      reviewOf(EReviewTargetType.PRODUCT, 'p1', 1),
      reviewOf(EReviewTargetType.PRODUCT, 'p2', 3),
      reviewOf(EReviewTargetType.USER, 'p1', 2), // same id, other target type
    ]) {
      await reviews.save(review);
    }
  });

  it('summarizes the reviews of one target only', async () => {
    await expect(
      useCase.execute({
        targetType: EReviewTargetType.PRODUCT,
        targetId: 'p1',
      }),
    ).resolves.toEqual({
      avgRating: 3.8, // 15 / 4 = 3.75
      reviewCount: 4,
      oneStarCount: 1,
      twoStarCount: 0,
      threeStarCount: 0,
      fourStarCount: 1,
      fiveStarCount: 2,
    });
  });

  it('returns all zero for a target without reviews', async () => {
    await expect(
      useCase.execute({
        targetType: EReviewTargetType.USER,
        targetId: 'nobody',
      }),
    ).resolves.toEqual({
      avgRating: 0,
      reviewCount: 0,
      oneStarCount: 0,
      twoStarCount: 0,
      threeStarCount: 0,
      fourStarCount: 0,
      fiveStarCount: 0,
    });
  });
});
