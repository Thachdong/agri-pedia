import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EReviewTargetType } from '../enums/review-target-type.enum';
import { InvalidReviewContentException } from '../exceptions/invalid-review-content.exception';
import { InvalidReviewStarException } from '../exceptions/invalid-review-star.exception';

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

export class Review extends AggregateRoot {
  private constructor(
    id: string,
    private props: TReviewProps,
  ) {
    super(id);
  }

  static create(input: TCreateReviewProps): Review {
    Review.assertValidStar(input.star);
    const content = input.content.trim();
    if (content.length === 0 || content.length > REVIEW_CONTENT_MAX_LENGTH) {
      throw new InvalidReviewContentException(REVIEW_CONTENT_MAX_LENGTH);
    }
    return new Review(randomUUID(), {
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      content,
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
