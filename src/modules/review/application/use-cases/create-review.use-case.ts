import { Inject, Injectable } from '@nestjs/common';
import {
  IProductQueryPort,
  PRODUCT_QUERY_PORT,
} from '@modules/product/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  EReviewTargetType,
  InvalidReviewTargetException,
  Review,
  ReviewAlreadyExistsException,
  ReviewReviewerNotAllowedException,
  ReviewTargetNotFoundException,
} from '../../domain';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../ports/review.repository';

export type TCreateReviewInput = {
  userId: string;
  targetType: EReviewTargetType;
  targetId: string;
  content: string;
  star: number;
};
export type TCreateReviewOutput = { reviewId: string };

/** An ACTIVE farmer reviews an ACTIVE distributor or one of its ACTIVE products, once per target. */
@Injectable()
export class CreateReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: IReviewRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(PRODUCT_QUERY_PORT)
    private readonly productQuery: IProductQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TCreateReviewInput): Promise<TCreateReviewOutput> {
    const reviewer = await this.userQuery.findRoleById(input.userId);
    if (!reviewer || reviewer.role !== 'FARMER' || !reviewer.isActive) {
      throw new ReviewReviewerNotAllowedException(input.userId);
    }
    await this.resolveTargetOwnerId(input.targetType, input.targetId);

    const review = await this.unitOfWork.runInTransaction(async () => {
      if (
        await this.reviews.existsByAuthorAndTarget(
          input.userId,
          input.targetType,
          input.targetId,
        )
      ) {
        throw new ReviewAlreadyExistsException(
          input.targetType,
          input.targetId,
        );
      }
      const created = Review.create({
        userId: input.userId,
        targetType: input.targetType,
        targetId: input.targetId,
        content: input.content,
        star: input.star,
      });
      await this.reviews.save(created);
      return created;
    });

    return { reviewId: review.id };
  }

  /** Checks the target can be reviewed; returns the user who receives the review. */
  private async resolveTargetOwnerId(
    targetType: EReviewTargetType,
    targetId: string,
  ): Promise<string> {
    if (targetType === EReviewTargetType.USER) {
      const target = await this.userQuery.findRoleById(targetId);
      if (!target) {
        throw new ReviewTargetNotFoundException(targetType, targetId);
      }
      if (target.role !== 'DISTRIBUTOR' || !target.isActive) {
        throw new InvalidReviewTargetException(targetType, targetId);
      }
      return target.userId;
    }

    const product = await this.productQuery.findOwnerById(targetId);
    if (!product) {
      throw new ReviewTargetNotFoundException(targetType, targetId);
    }
    if (!product.isActive) {
      throw new InvalidReviewTargetException(targetType, targetId);
    }
    return product.userId;
  }
}
