import { Injectable } from '@nestjs/common';
import {
  Brackets,
  DataSource,
  QueryFailedError,
  SelectQueryBuilder,
} from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IReviewRepository,
  TReviewPageQuery,
  TReviewStarCounts,
  TReviewTargets,
} from '../../application/ports';
import {
  EReviewTargetType,
  Review,
  ReviewAlreadyExistsException,
} from '../../domain';
import { ReviewMapper } from './review.mapper';
import { ReviewOrmEntity } from './review.orm-entity';

const PG_UNIQUE_VIOLATION = '23505';
const USER_TARGET_CONSTRAINT = 'UQ_reviews_user_target';

@Injectable()
export class PgReviewRepository
  extends TypeOrmRepositoryBase<ReviewOrmEntity>
  implements IReviewRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ReviewOrmEntity);
  }

  async existsByAuthorAndTarget(
    userId: string,
    targetType: EReviewTargetType,
    targetId: string,
  ): Promise<boolean> {
    return this.repository.existsBy({ userId, targetType, targetId });
  }

  async findByTargets(
    targets: TReviewTargets,
    { targetType, star, after, limit }: TReviewPageQuery,
  ): Promise<Review[]> {
    const query = this.ofTargets(targets);
    if (targetType !== undefined) {
      query.andWhere('review.target_type = :targetType', { targetType });
    }
    if (star !== undefined) {
      query.andWhere('review.star = :star', { star });
    }
    if (after) {
      // Row comparison matches the (created_at desc, id desc) order.
      query.andWhere('(review.created_at, review.id) < (:createdAt, :id)', {
        createdAt: after.createdAt,
        id: after.id,
      });
    }
    const rows = await query
      .orderBy('review.created_at', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .limit(limit)
      .getMany();
    return rows.map((row) => ReviewMapper.toDomain(row));
  }

  async summarizeByTargets(
    targets: TReviewTargets,
  ): Promise<TReviewStarCounts> {
    const rows = await this.ofTargets(targets)
      .select('review.star', 'star')
      .addSelect('COUNT(*)', 'count')
      .groupBy('review.star')
      .getRawMany<{ star: number; count: string }>();
    const counts: TReviewStarCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rows.forEach((row) => {
      counts[row.star as keyof TReviewStarCounts] = Number(row.count);
    });
    return counts;
  }

  async save(review: Review): Promise<void> {
    try {
      await this.repository.save(ReviewMapper.toOrm(review));
    } catch (error) {
      // Concurrent reviews of the same target pass the exists-check; the index catches it.
      if (isUniqueViolation(error, USER_TARGET_CONSTRAINT)) {
        throw new ReviewAlreadyExistsException(
          review.targetType,
          review.targetId,
        );
      }
      throw error;
    }
  }

  /** Reviews of the distributor itself (USER) or of any of its products (PRODUCT). */
  private ofTargets({
    userId,
    productIds,
  }: TReviewTargets): SelectQueryBuilder<ReviewOrmEntity> {
    return this.repository.createQueryBuilder('review').where(
      new Brackets((targets) => {
        targets.where(
          '(review.target_type = :userType AND review.target_id = :userId)',
          { userType: EReviewTargetType.USER, userId },
        );
        if (productIds.length > 0) {
          targets.orWhere(
            '(review.target_type = :productType AND review.target_id IN (:...productIds))',
            { productType: EReviewTargetType.PRODUCT, productIds },
          );
        }
      }),
    );
  }
}

const isUniqueViolation = (error: unknown, constraint: string): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return (
    driverError.code === PG_UNIQUE_VIOLATION &&
    driverError.constraint === constraint
  );
};
