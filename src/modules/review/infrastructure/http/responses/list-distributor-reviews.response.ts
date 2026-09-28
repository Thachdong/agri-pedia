import { EReviewTargetType } from '../../../domain';

export class ReviewStarCountsResponse {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export class ReviewSummaryResponse {
  /** Average star, 1 decimal; 0 when the shop has no review. */
  avgRating: number;
  reviewCount: number;
  /** Number of reviews per star. */
  starCounts: ReviewStarCountsResponse;
}

export class ReviewerResponse {
  id: string;
  /** Null when the reviewer account no longer exists. */
  username: string | null;
  /** Signed read URL of the avatar (expires); null when the reviewer has none. */
  avatar: string | null;
}

export class DistributorReviewResponse {
  id: string;
  targetType: EReviewTargetType;
  /** Distributor id (USER) or product id (PRODUCT). */
  targetId: string;
  /** Name of the reviewed product; null for a review of the shop (USER). */
  productName: string | null;
  star: number;
  content: string;
  createdAt: Date;
  user: ReviewerResponse;
}

export class ListDistributorReviewsResponse {
  /** Over every review of the shop; not affected by filters or cursor. */
  summary: ReviewSummaryResponse;
  /** Newest first. */
  reviews: DistributorReviewResponse[];
  /** Pass as `cursor` (with the same filters) to get the next page; null on the last page. */
  nextCursor: string | null;
}
