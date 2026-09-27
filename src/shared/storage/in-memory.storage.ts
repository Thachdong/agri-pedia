import {
  IFileStorage,
  TPresignedUpload,
  TPresignedUploadInput,
} from './storage.interface';

/** Test fake: records presign requests and returns a fake URL for the key. */
export class InMemoryFileStorage implements IFileStorage {
  readonly presigned: TPresignedUploadInput[] = [];

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
}
