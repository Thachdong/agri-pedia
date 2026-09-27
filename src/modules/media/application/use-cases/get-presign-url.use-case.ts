import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { EMediaType, MEDIA_MAX_SIZE_BYTES, MediaExtension } from '../../domain';

export type TGetPresignUrlInput = {
  /** Caller, from the access token. */
  userId: string;
  type: EMediaType;
  extension: string;
};

export type TGetPresignUrlOutput = {
  presignUrl: string;
  /** Object key in TMP, e.g. `tmp/<userId>/<uuid>.png`; sent back later to confirm the upload. */
  key: string;
  /** Headers the client must send with the PUT (Content-Type, size range). */
  headers: Record<string, string>;
};

@Injectable()
export class GetPresignUrlUseCase {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorage) {}

  /** Signed PUT URL for a new object in TMP; the object only becomes Media once confirmed. */
  async execute(input: TGetPresignUrlInput): Promise<TGetPresignUrlOutput> {
    const extension = MediaExtension.create(input.type, input.extension);
    const key = `tmp/${input.userId}/${randomUUID()}.${extension.value}`;
    const upload = await this.storage.createPresignedUploadUrl({
      key,
      contentType: extension.contentType,
      maxSizeBytes: MEDIA_MAX_SIZE_BYTES,
    });
    return { presignUrl: upload.url, key, headers: upload.headers };
  }
}
