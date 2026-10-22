/** Photo as sent by the distributor (validated type and size, not decoded yet). */
export type TProductPhoto = {
  data: Buffer;
  mimeType: string;
};

/** Thrown by the reader when the content cannot be decoded as an image. */
export class ProductPhotoUnreadableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = ProductPhotoUnreadableError.name;
  }
}

export interface IProductNameReader {
  /**
   * Trade name printed most prominently on the product in the photo, read by AI `model`; null when no name can be read
   * (no product, blurry, no text). Throws ProductPhotoUnreadableError when the photo cannot be decoded;
   * any other error means the reading service failed.
   */
  read(photo: TProductPhoto, model: string): Promise<string | null>;
}

export const PRODUCT_NAME_READER = Symbol('PRODUCT_NAME_READER');
