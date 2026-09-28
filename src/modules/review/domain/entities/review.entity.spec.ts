import { EReviewTargetType } from '../enums/review-target-type.enum';
import { InvalidReviewContentException } from '../exceptions/invalid-review-content.exception';
import { InvalidReviewStarException } from '../exceptions/invalid-review-star.exception';
import { ReviewNotOwnerException } from '../exceptions/review-not-owner.exception';
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

describe('Review.assertOwnedBy', () => {
  it('passes for the author', () => {
    expect(() => Review.create(input).assertOwnedBy('farmer-1')).not.toThrow();
  });

  it('rejects another user', () => {
    expect(() => Review.create(input).assertOwnedBy('farmer-2')).toThrow(
      ReviewNotOwnerException,
    );
  });
});

describe('Review.update', () => {
  it('changes content (trimmed) and star', () => {
    const review = Review.create(input);

    review.update({ content: '  Tạm ổn  ', star: 3 });

    expect(review.content).toBe('Tạm ổn');
    expect(review.star).toBe(3);
  });

  it('keeps omitted fields', () => {
    const review = Review.create(input);

    review.update({ star: 2 });

    expect(review.content).toBe('Phân tốt, giao nhanh');
    expect(review.star).toBe(2);
  });

  it.each([0, 6, 2.5])('rejects star %p', (star) => {
    const review = Review.create(input);

    expect(() => review.update({ star })).toThrow(InvalidReviewStarException);
    expect(review.star).toBe(5);
  });

  it.each(['   ', 'a'.repeat(REVIEW_CONTENT_MAX_LENGTH + 1)])(
    'rejects content of length %#',
    (content) => {
      const review = Review.create(input);

      expect(() => review.update({ content })).toThrow(
        InvalidReviewContentException,
      );
      expect(review.content).toBe('Phân tốt, giao nhanh');
    },
  );
});
