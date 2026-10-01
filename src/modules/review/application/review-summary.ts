import { TReviewStarCounts } from './ports/review.repository';

export type TReviewSummary = {
  /** Average star, 1 decimal; 0 when there is no review. */
  avgRating: number;
  reviewCount: number;
  starCounts: TReviewStarCounts;
};

export const summarizeReviews = (
  starCounts: TReviewStarCounts,
): TReviewSummary => {
  const stars = [1, 2, 3, 4, 5] as const;
  const reviewCount = stars.reduce((sum, star) => sum + starCounts[star], 0);
  const total = stars.reduce((sum, star) => sum + star * starCounts[star], 0);
  return {
    avgRating: reviewCount ? Math.round((total / reviewCount) * 10) / 10 : 0,
    reviewCount,
    starCounts,
  };
};
