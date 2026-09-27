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

/** Thrown by moveFile when the source object does not exist. */
export class StorageFileNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`Storage object not found: ${key}`);
    this.name = StorageFileNotFoundError.name;
  }
}

export interface IFileStorage {
  createPresignedUploadUrl(
    input: TPresignedUploadInput,
  ): Promise<TPresignedUpload>;
  /** Signed GET URL for an object, valid for the configured download TTL. Does not check the object exists. */
  createDownloadUrl(key: string): Promise<string>;
  /** Moves an object inside the bucket; throws StorageFileNotFoundError if `fromKey` is missing. */
  moveFile(fromKey: string, toKey: string): Promise<void>;
  /** Deletes an object; a missing object is a no-op. */
  deleteFile(key: string): Promise<void>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
