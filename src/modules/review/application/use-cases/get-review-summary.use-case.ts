import { Inject, Injectable } from '@nestjs/common';
import { EReviewTargetType } from '../../domain';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../ports/review.repository';
import { summarizeReviews } from '../review-summary';

export type TGetReviewSummaryInput = {
  targetType: EReviewTargetType;
  targetId: string;
};

export type TGetReviewSummaryOutput = {
  /** Average star, 1 decimal; 0 when there is no review. */
  avgRating: number;
  reviewCount: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
};

/** Public rating of one product (PRODUCT) or one distributor (USER, its own reviews only). Unknown target → all zero. */
@Injectable()
export class GetReviewSummaryUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: IReviewRepository,
  ) {}

  async execute(
    input: TGetReviewSummaryInput,
  ): Promise<TGetReviewSummaryOutput> {
    const { avgRating, reviewCount, starCounts } = summarizeReviews(
      await this.reviews.summarizeByTarget(input.targetType, input.targetId),
    );
    return {
      avgRating,
      reviewCount,
      oneStarCount: starCounts[1],
      twoStarCount: starCounts[2],
      threeStarCount: starCounts[3],
      fourStarCount: starCounts[4],
      fiveStarCount: starCounts[5],
    };
  }
}
