import { EReviewTargetType, Review } from '../../domain';

/** Everything a shop can be reviewed on: the distributor itself and its products. */
export type TReviewTargets = {
  /** Distributor reviewed as targetType USER. */
  userId: string;
  /** Products reviewed as targetType PRODUCT. */
  productIds: string[];
};

/** Position after which the next page starts (the last item of the previous page). */
export type TReviewPageKey = { createdAt: Date; id: string };

export type TReviewPageQuery = {
  targetType?: EReviewTargetType;
  star?: number;
  after?: TReviewPageKey;
  limit: number;
};

/** Number of reviews per star (1..5). */
export type TReviewStarCounts = Record<1 | 2 | 3 | 4 | 5, number>;

export interface IReviewRepository {
  findById(id: string): Promise<Review | null>;
  /** True when `userId` already reviewed this target. */
  existsByAuthorAndTarget(
    userId: string,
    targetType: EReviewTargetType,
    targetId: string,
  ): Promise<boolean>;
  /** Reviews of the targets matching the filters, newest first (createdAt desc, id desc). */
  findByTargets(
    targets: TReviewTargets,
    query: TReviewPageQuery,
  ): Promise<Review[]>;
  /** Star counts over every review of the targets (no filter). */
  summarizeByTargets(targets: TReviewTargets): Promise<TReviewStarCounts>;
  save(review: Review): Promise<void>;
}

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');
