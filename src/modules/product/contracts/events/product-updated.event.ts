import { TIntegrationEvent } from '@shared/event-bus';
import { TProductCreatedMediaPayload } from './product-created.event';

/** A distributor changed a product; media to add are still in TMP and must be confirmed, media to remove must be deleted. */
export const PRODUCT_UPDATED_EVENT = 'product.product.updated';

/** Same shape as on create: a TMP file returned by presign. */
export type TProductUpdatedMediaPayload = TProductCreatedMediaPayload;

export type TProductUpdatedEventPayload = {
  productId: string;
  /** Seller; also the uploader of the TMP files. */
  userId: string;
  addMedia: TProductUpdatedMediaPayload[];
  /** Media ids requested for removal; not checked against the product here. */
  removeMediaIds: string[];
};

export type TProductUpdatedEvent = TIntegrationEvent<
  typeof PRODUCT_UPDATED_EVENT,
  TProductUpdatedEventPayload
>;
