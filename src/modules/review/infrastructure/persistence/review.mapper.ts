import { EReviewTargetType, Review } from '../../domain';
import { ReviewOrmEntity } from './review.orm-entity';

export class ReviewMapper {
  static toDomain(row: ReviewOrmEntity): Review {
    return Review.restore(row.id, {
      userId: row.userId,
      targetType: row.targetType as EReviewTargetType,
      targetId: row.targetId,
      content: row.content,
      star: row.star,
      createdAt: row.createdAt,
    });
  }

  static toOrm(review: Review): ReviewOrmEntity {
    return Object.assign(new ReviewOrmEntity(), {
      id: review.id,
      userId: review.userId,
      targetType: review.targetType,
      targetId: review.targetId,
      content: review.content,
      star: review.star,
      createdAt: review.createdAt,
    });
  }
}
