import { EReviewTargetType } from '../enums/review-target-type.enum';
import { InvalidReviewContentException } from '../exceptions/invalid-review-content.exception';
import { InvalidReviewStarException } from '../exceptions/invalid-review-star.exception';
import {
  REVIEW_CONTENT_MAX_LENGTH,
  Review,
  TCreateReviewProps,
} from './review.entity';

const input: TCreateReviewProps = {
  userId: 'farmer-1',
  targetType: EReviewTargetType.PRODUCT,
  targetId: 'product-1',
  content: '  Phân tốt, giao nhanh  ',
  star: 5,
};

describe('Review.create', () => {
  it('creates a review with trimmed content and a new id', () => {
    const before = Date.now();
    const review = Review.create(input);

    expect(review.id).toEqual(expect.any(String));
    expect(review.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(review.content).toBe('Phân tốt, giao nhanh');
    expect(review).toMatchObject({
      userId: 'farmer-1',
      targetType: EReviewTargetType.PRODUCT,
      targetId: 'product-1',
      star: 5,
    });
  });

  it.each([1, 5])('accepts star %p', (star) => {
    expect(Review.create({ ...input, star }).star).toBe(star);
  });

  it.each([0, 6, 2.5, Number.NaN])('rejects star %p', (star) => {
    expect(() => Review.create({ ...input, star })).toThrow(
      InvalidReviewStarException,
    );
  });

  it('accepts content of max length', () => {
    const content = 'a'.repeat(REVIEW_CONTENT_MAX_LENGTH);

    expect(Review.create({ ...input, content }).content).toBe(content);
  });

  it.each(['', '   ', 'a'.repeat(REVIEW_CONTENT_MAX_LENGTH + 1)])(
    'rejects content of length %#',
    (content) => {
      expect(() => Review.create({ ...input, content })).toThrow(
        InvalidReviewContentException,
      );
    },
  );
});

describe('Review.restore', () => {
  it('rebuilds a review without validation', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const review = Review.restore('r1', {
      ...input,
      content: 'x',
      createdAt,
    });

    expect(review.id).toBe('r1');
    expect(review.createdAt).toBe(createdAt);
  });
});
