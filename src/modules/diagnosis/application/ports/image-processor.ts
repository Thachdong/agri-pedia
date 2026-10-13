/** Image re-encoded by the processor: EXIF orientation applied, metadata stripped, JPEG. */
export type TProcessedImage = {
  data: Buffer;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
};

/** Thrown by the image processor when the content is not a readable, supported image. */
export class ImageUnreadableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = ImageUnreadableError.name;
  }
}

export interface IImageProcessor {
  /**
   * Decodes by content (not extension; jpg/png/webp), rotates by EXIF, strips all metadata (GPS included),
   * resizes the long side to <= 2048px and re-encodes as JPEG. Throws ImageUnreadableError.
   */
  normalize(data: Buffer): Promise<TProcessedImage>;
}

export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');
