import { TIntegrationEvent } from '@shared/event-bus';

/** A farmer changed their review of a distributor or one of its products. */
export const REVIEW_UPDATED_EVENT = 'review.review.updated';

export type TReviewUpdatedEventPayload = {
  reviewId: string;
  /** User who received the review: the distributor itself, or the seller of the product. */
  targetOwnerId: string;
  /** 1..5, after the update */
  star: number;
};

export type TReviewUpdatedEvent = TIntegrationEvent<
  typeof REVIEW_UPDATED_EVENT,
  TReviewUpdatedEventPayload
>;
