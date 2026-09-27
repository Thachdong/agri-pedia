import { TIntegrationEvent } from '@shared/event-bus';

/** A distributor listed a new product; its media are still in TMP and must be confirmed. */
export const PRODUCT_CREATED_EVENT = 'product.product.created';

export type TProductCreatedMediaPayload = {
  /** TMP key returned by presign, e.g. `tmp/<userId>/<uuid>.png`. */
  key: string;
  type: 'IMAGE' | 'VIDEO' | 'FILE';
  extension: string;
  filename: string;
  sortOrder?: number;
};

export type TProductCreatedEventPayload = {
  productId: string;
  /** Seller; also the uploader of the TMP files. */
  userId: string;
  media: TProductCreatedMediaPayload[];
};

export type TProductCreatedEvent = TIntegrationEvent<
  typeof PRODUCT_CREATED_EVENT,
  TProductCreatedEventPayload
>;
