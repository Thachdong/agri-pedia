import {
  IFileStorage,
  StorageFileNotFoundError,
  TPresignedUpload,
  TPresignedUploadInput,
} from './storage.interface';

/** Test fake: records presign requests and returns a fake URL for the key; keeps object keys in a set and uploaded content by key; public URL = `https://storage.test/<key>`. */
export class InMemoryFileStorage implements IFileStorage {
  readonly presigned: TPresignedUploadInput[] = [];
  readonly files = new Set<string>();
  /** Content written by uploadFile / uploadPublicFile, by key; `isPublic` marks uploadPublicFile. */
  readonly uploaded = new Map<
    string,
    { content: Buffer; contentType: string; isPublic: boolean }
  >();

  async createPresignedUploadUrl(
    input: TPresignedUploadInput,
  ): Promise<TPresignedUpload> {
    this.presigned.push(input);
    return {
      url: `https://storage.test/${input.key}?signed=1`,
      headers: {
        'Content-Type': input.contentType,
        'x-goog-content-length-range': `0,${input.maxSizeBytes}`,
      },
    };
  }

  async createDownloadUrl(key: string): Promise<string> {
    return `https://storage.test/${key}?signed=read`;
  }

  async uploadFile(
    key: string,
    content: Buffer,
    contentType: string,
  ): Promise<void> {
    this.files.add(key);
    this.uploaded.set(key, { content, contentType, isPublic: false });
  }

  async uploadPublicFile(
    key: string,
    content: Buffer,
    contentType: string,
  ): Promise<void> {
    this.files.add(key);
    this.uploaded.set(key, { content, contentType, isPublic: true });
  }

  publicUrl(key: string): string {
    return `https://storage.test/${key}`;
  }

  async moveFile(fromKey: string, toKey: string): Promise<void> {
    if (!this.files.delete(fromKey)) {
      throw new StorageFileNotFoundError(fromKey);
    }
    this.files.add(toKey);
  }

  async deleteFile(key: string): Promise<void> {
    this.files.delete(key);
  }
}
