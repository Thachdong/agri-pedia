import { TIntegrationEvent } from '@shared/event-bus';

/** A distributor deleted a product (soft delete); its media must be removed. */
export const PRODUCT_DELETED_EVENT = 'product.product.deleted';

export type TProductDeletedEventPayload = {
  productId: string;
};

export type TProductDeletedEvent = TIntegrationEvent<
  typeof PRODUCT_DELETED_EVENT,
  TProductDeletedEventPayload
>;
