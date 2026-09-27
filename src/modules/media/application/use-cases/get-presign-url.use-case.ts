import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { EMediaType, MEDIA_MAX_SIZE_BYTES, MediaExtension } from '../../domain';

export type TGetPresignUrlInput = {
  /** Caller, from the access token. */
  userId: string;
  files: { type: EMediaType; extension: string }[];
};

export type TPresignedMedia = {
  presignUrl: string;
  /** Object key in TMP, e.g. `tmp/<userId>/<uuid>.png`; sent back later to confirm the upload. */
  key: string;
  /** Headers the client must send with the PUT (Content-Type, size range). */
  headers: Record<string, string>;
};

export type TGetPresignUrlOutput = {
  /** Same order as `files`. */
  items: TPresignedMedia[];
};

@Injectable()
export class GetPresignUrlUseCase {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorage) {}

  /**
   * Signed PUT URLs for new objects in TMP; objects only become Media once confirmed.
   * All-or-nothing: any invalid extension fails the whole request before anything is signed.
   */
  async execute(input: TGetPresignUrlInput): Promise<TGetPresignUrlOutput> {
    const extensions = MediaExtension.createMany(input.files);
    const items = await Promise.all(
      extensions.map(async (extension): Promise<TPresignedMedia> => {
        const key = `tmp/${input.userId}/${randomUUID()}.${extension.value}`;
        const upload = await this.storage.createPresignedUploadUrl({
          key,
          contentType: extension.contentType,
          maxSizeBytes: MEDIA_MAX_SIZE_BYTES,
        });
        return { presignUrl: upload.url, key, headers: upload.headers };
      }),
    );
    return { items };
  }
}
