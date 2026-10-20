export type TPublishArticleImageInput = {
  /** Uploaded file (presign TMP key). */
  tmpKey: string;
  /** Public key without hash and extension, e.g. `articles/RICE/RICE_BLAST/dao-on-1`. */
  keyPrefix: string;
};

export type TPublishedArticleImage = {
  /** `<keyPrefix>.<sha8>.webp` in the public bucket. */
  key: string;
  width: number;
  height: number;
};

/** Turns an uploaded image into a public article image (webp, content hash in the key). */
export interface IArticleImagePublisher {
  /** null when the upload is missing or not a readable image. The TMP file is left in place. */
  publish(
    input: TPublishArticleImageInput,
  ): Promise<TPublishedArticleImage | null>;
}

export const ARTICLE_IMAGE_PUBLISHER = Symbol('ARTICLE_IMAGE_PUBLISHER');
