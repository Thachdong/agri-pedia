import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  FILE_STORAGE,
  IFileStorage,
  StorageFileNotFoundError,
} from '@shared/storage';
import * as sharp from 'sharp';
import {
  IArticleImagePublisher,
  TPublishArticleImageInput,
  TPublishedArticleImage,
} from '../../application/ports';

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];
/** Articles show images at most this wide; larger uploads are scaled down. */
const MAX_WIDTH_PX = 1600;
const WEBP_QUALITY = 82;

/** Reads the TMP upload, re-encodes it as webp (EXIF orientation applied, metadata dropped), uploads it publicly. */
@Injectable()
export class SharpArticleImagePublisher implements IArticleImagePublisher {
  constructor(@Inject(FILE_STORAGE) private readonly storage: IFileStorage) {}

  async publish(
    input: TPublishArticleImageInput,
  ): Promise<TPublishedArticleImage | null> {
    let upload: Buffer;
    try {
      upload = await this.storage.downloadFile(input.tmpKey);
    } catch (error) {
      if (error instanceof StorageFileNotFoundError) return null;
      throw error;
    }
    const image = await toWebp(upload);
    if (!image) return null;

    const sha8 = createHash('sha256')
      .update(image.data)
      .digest('hex')
      .slice(0, 8);
    const key = `${input.keyPrefix}.${sha8}.webp`;
    await this.storage.uploadPublicFile(key, image.data, 'image/webp');
    return { key, width: image.width, height: image.height };
  }
}

async function toWebp(
  upload: Buffer,
): Promise<{ data: Buffer; width: number; height: number } | null> {
  try {
    const { format } = await sharp(upload).metadata();
    if (!format || !ACCEPTED_FORMATS.includes(format)) return null;
    const { data, info } = await sharp(upload, { failOn: 'error' })
      .rotate()
      .resize({ width: MAX_WIDTH_PX, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}
