import { ReviewerResponse } from './list-distributor-reviews.response';

export class ProductReviewResponse {
  id: string;
  star: number;
  content: string;
  createdAt: Date;
  user: ReviewerResponse;
}

export class ListProductReviewsResponse {
  /** Newest first. */
  reviews: ProductReviewResponse[];
  /** Pass as `cursor` (with the same filters) to get the next page; null on the last page. */
  nextCursor: string | null;
}
