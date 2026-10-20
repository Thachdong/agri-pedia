import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { IImageQualityInspector, TImageQuality } from '../../application/ports';

/** Measured on a greyscale copy with this long side, so sharpness compares across image sizes. */
const MEASURE_SIDE_PX = 1024;

/** sharp (libvips) adapter. */
@Injectable()
export class SharpImageQualityInspector implements IImageQualityInspector {
  async inspect(data: Buffer): Promise<TImageQuality> {
    const { width = 0, height = 0 } = await sharp(data).metadata();
    const grey = await sharp(data)
      .rotate()
      .resize({
        width: MEASURE_SIDE_PX,
        height: MEASURE_SIDE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .greyscale()
      .toBuffer();
    const stats = await sharp(grey).stats();
    return {
      width,
      height,
      sharpness: stats.sharpness,
      brightness: stats.channels[0].mean,
    };
  }
}
