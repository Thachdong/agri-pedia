import { Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IReviewRepository } from '../../application/ports';
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
