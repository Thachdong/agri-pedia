import { Inject, Injectable } from '@nestjs/common';
import {
  IProductQueryPort,
  PRODUCT_QUERY_PORT,
} from '@modules/product/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  createIntegrationEvent,
  EVENT_BUS,
  IEventBus,
} from '@shared/event-bus';
import {
  REVIEW_UPDATED_EVENT,
  TReviewUpdatedEventPayload,
} from '../../contracts';
import {
  EReviewTargetType,
  Review,
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
    @Inject(PRODUCT_QUERY_PORT)
    private readonly productQuery: IProductQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: TUpdateReviewInput): Promise<void> {
    const reviewer = await this.userQuery.findRoleById(input.userId);
    if (!reviewer || reviewer.role !== 'FARMER' || !reviewer.isActive) {
      throw new ReviewReviewerNotAllowedException(input.userId);
    }

    const updated = await this.unitOfWork.runInTransaction(async () => {
      const review = await this.reviews.findById(input.reviewId);
      if (!review) {
        throw new ReviewNotFoundException(input.reviewId);
      }
      review.assertOwnedBy(input.userId);
      if (input.content === undefined && input.star === undefined) {
        return null;
      }
      review.update({ content: input.content, star: input.star });
      await this.reviews.save(review);
      return review;
    });
    if (!updated) {
      return;
    }

    const targetOwnerId = await this.findTargetOwnerId(updated);
    if (!targetOwnerId) {
      return;
    }
    await this.eventBus.publish(
      createIntegrationEvent<
        typeof REVIEW_UPDATED_EVENT,
        TReviewUpdatedEventPayload
      >(REVIEW_UPDATED_EVENT, {
        reviewId: updated.id,
        targetOwnerId,
        star: updated.star,
      }),
    );
  }

  /** User who received the review; null when the reviewed product no longer exists. */
  private async findTargetOwnerId(review: Review): Promise<string | null> {
    if (review.targetType === EReviewTargetType.USER) {
      return review.targetId;
    }
    const product = await this.productQuery.findOwnerById(review.targetId);
    return product?.userId ?? null;
  }
}
