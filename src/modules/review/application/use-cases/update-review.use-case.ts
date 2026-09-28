import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  ReviewNotFoundException,
  ReviewReviewerNotAllowedException,
} from '../../domain';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../ports/review.repository';

export type TUpdateReviewInput = {
  userId: string;
  reviewId: string;
  content?: string;
  star?: number;
};

/** An ACTIVE farmer changes their own review; omitted fields are kept. */
@Injectable()
export class UpdateReviewUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: IReviewRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TUpdateReviewInput): Promise<void> {
    const reviewer = await this.userQuery.findRoleById(input.userId);
    if (!reviewer || reviewer.role !== 'FARMER' || !reviewer.isActive) {
      throw new ReviewReviewerNotAllowedException(input.userId);
    }

    await this.unitOfWork.runInTransaction(async () => {
      const review = await this.reviews.findById(input.reviewId);
      if (!review) {
        throw new ReviewNotFoundException(input.reviewId);
      }
      review.assertOwnedBy(input.userId);
      if (input.content === undefined && input.star === undefined) {
        return;
      }
      review.update({ content: input.content, star: input.star });
      await this.reviews.save(review);
    });
  }
}
