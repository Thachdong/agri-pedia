import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import {
  IImageProcessor,
  ImageUnreadableError,
  TNormalizedImage,
  TProcessedImage,
} from '../../application/ports';
import { TBox } from '../../domain';

const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];
const MAX_SIDE_PX = 2048;
const JPEG_QUALITY = 85;
/** Crops are enlarged around the region center and never smaller than this a side. */
const CROP_SCALE = 2;
const CROP_MIN_SIDE_PX = 256;
const THUMBNAIL_SIDE_PX = 768;

async function toJpeg(pipeline: sharp.Sharp): Promise<TProcessedImage> {
  const { data, info } = await pipeline
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    mimeType: 'image/jpeg',
    width: info.width,
    height: info.height,
  };
}

/** Span of `size` px centered on `center`, inside [0, total]. */
function span(center: number, size: number, total: number) {
  const length = Math.min(Math.round(size), total);
  const start = Math.min(
    Math.max(Math.round(center - length / 2), 0),
    total - length,
  );
  return { start, length };
}

/** sharp (libvips) adapter. Output never carries metadata: sharp drops it unless asked to keep it. */
@Injectable()
export class SharpImageProcessor implements IImageProcessor {
  async normalize(data: Buffer): Promise<TNormalizedImage> {
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(data).metadata();
    } catch {
      throw new ImageUnreadableError('Unreadable image');
    }
    const { format } = metadata;
    if (!format || !ACCEPTED_FORMATS.includes(format)) {
      throw new ImageUnreadableError(
        `Unsupported image format ${format ?? 'unknown'} (jpg, png, webp only)`,
      );
    }
    // EXIF orientations 5..8 turn the image a quarter.
    const turned = (metadata.orientation ?? 1) >= 5;
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    try {
      const image = await toJpeg(
        sharp(data, { failOn: 'error' }).rotate().resize({
          width: MAX_SIDE_PX,
          height: MAX_SIDE_PX,
          fit: 'inside',
          withoutEnlargement: true,
        }),
      );
      return {
        ...image,
        sourceWidth: turned ? height : width,
        sourceHeight: turned ? width : height,
      };
    } catch {
      throw new ImageUnreadableError('Unreadable image');
    }
  }

  async crop(image: TProcessedImage, box: TBox): Promise<TProcessedImage> {
    const { width, height } = image;
    const size = (relative: number, total: number) =>
      Math.max(relative * total * CROP_SCALE, CROP_MIN_SIDE_PX);
    const x = span((box.x + box.w / 2) * width, size(box.w, width), width);
    const y = span((box.y + box.h / 2) * height, size(box.h, height), height);
    return toJpeg(
      sharp(image.data).extract({
        left: x.start,
        top: y.start,
        width: x.length,
        height: y.length,
      }),
    );
  }

  async thumbnail(image: TProcessedImage): Promise<TProcessedImage> {
    return toJpeg(
      sharp(image.data).resize({
        width: THUMBNAIL_SIDE_PX,
        height: THUMBNAIL_SIDE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      }),
    );
  }
}
