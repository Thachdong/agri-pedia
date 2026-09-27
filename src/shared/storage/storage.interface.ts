export type TPresignedUploadInput = {
  /** Object path inside the bucket, e.g. `tmp/<userId>/<uuid>.png`. */
  key: string;
  /** Upload must be sent with exactly this Content-Type. */
  contentType: string;
  /** Upload larger than this is rejected by the storage provider. */
  maxSizeBytes: number;
};

export type TPresignedUpload = {
  /** PUT target; valid for the configured presign TTL. */
  url: string;
  /** Headers the client must send with the PUT, otherwise the signature does not match. */
  headers: Record<string, string>;
};

export interface IFileStorage {
  createPresignedUploadUrl(
    input: TPresignedUploadInput,
  ): Promise<TPresignedUpload>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
