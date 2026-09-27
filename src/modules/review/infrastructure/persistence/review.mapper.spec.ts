import { EReviewTargetType, Review } from '../../domain';
import { ReviewMapper } from './review.mapper';

describe('ReviewMapper', () => {
  it('round-trips domain -> orm -> domain keeping every field', () => {
    const review = Review.create({
      userId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
      targetType: EReviewTargetType.PRODUCT,
      targetId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
      content: 'Phân tốt',
      star: 4,
    });

    const restored = ReviewMapper.toDomain(ReviewMapper.toOrm(review));

    expect(restored).toEqual(review);
  });
});
