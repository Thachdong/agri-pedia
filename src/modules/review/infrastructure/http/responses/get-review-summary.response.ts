export class GetReviewSummaryResponse {
  /** Average star, 1 decimal; 0 when there is no review. */
  avgRating: number;
  reviewCount: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
}
