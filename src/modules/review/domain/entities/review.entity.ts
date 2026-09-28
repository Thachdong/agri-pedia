import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EReviewTargetType } from '../enums/review-target-type.enum';
import { InvalidReviewContentException } from '../exceptions/invalid-review-content.exception';
import { InvalidReviewStarException } from '../exceptions/invalid-review-star.exception';
import { ReviewNotOwnerException } from '../exceptions/review-not-owner.exception';

export const REVIEW_CONTENT_MAX_LENGTH = 1000;

export type TReviewProps = {
  /** Author (a FARMER). */
  userId: string;
  targetType: EReviewTargetType;
  targetId: string;
  content: string;
  star: number;
  createdAt: Date;
};

export type TCreateReviewProps = Omit<TReviewProps, 'createdAt'>;

export type TUpdateReviewProps = Partial<
  Pick<TReviewProps, 'content' | 'star'>
>;

export class Review extends AggregateRoot {
  private constructor(
    id: string,
    private props: TReviewProps,
  ) {
    super(id);
  }

  static create(input: TCreateReviewProps): Review {
    Review.assertValidStar(input.star);
    return new Review(randomUUID(), {
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      content: Review.normalizeContent(input.content),
      star: input.star,
      createdAt: new Date(),
    });
  }

  static restore(id: string, props: TReviewProps): Review {
    return new Review(id, { ...props });
  }

  private static assertValidStar(star: number): void {
    if (!Number.isInteger(star) || star < 1 || star > 5) {
      throw new InvalidReviewStarException(star);
    }
  }

  private static normalizeContent(raw: string): string {
    const content = raw.trim();
    if (content.length === 0 || content.length > REVIEW_CONTENT_MAX_LENGTH) {
      throw new InvalidReviewContentException(REVIEW_CONTENT_MAX_LENGTH);
    }
    return content;
  }

  assertOwnedBy(userId: string): void {
    if (this.props.userId !== userId) {
      throw new ReviewNotOwnerException(this.id, userId);
    }
  }

  /** Applies the given changes; validates star/content like create. */
  update(changes: TUpdateReviewProps): void {
    if (changes.star !== undefined) {
      Review.assertValidStar(changes.star);
    }
    const content =
      changes.content !== undefined
        ? Review.normalizeContent(changes.content)
        : undefined;
    this.props = {
      ...this.props,
      ...(content !== undefined && { content }),
      ...(changes.star !== undefined && { star: changes.star }),
    };
  }

  get userId(): string {
    return this.props.userId;
  }

  get targetType(): EReviewTargetType {
    return this.props.targetType;
  }

  get targetId(): string {
    return this.props.targetId;
  }

  get content(): string {
    return this.props.content;
  }

  get star(): number {
    return this.props.star;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
