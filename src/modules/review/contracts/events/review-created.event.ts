import { TIntegrationEvent } from '@shared/event-bus';

/** A farmer reviewed a distributor (USER) or one of its products (PRODUCT). */
export const REVIEW_CREATED_EVENT = 'review.review.created';

export type TReviewCreatedEventPayload = {
  reviewId: string;
  /** Author (a FARMER). */
  reviewerId: string;
  targetType: 'PRODUCT' | 'USER';
  targetId: string;
  /** User who received the review: the distributor itself, or the seller of the product. */
  targetOwnerId: string;
  /** 1..5 */
  star: number;
};

export type TReviewCreatedEvent = TIntegrationEvent<
  typeof REVIEW_CREATED_EVENT,
  TReviewCreatedEventPayload
>;
