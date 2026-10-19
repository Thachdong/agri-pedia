import { TBox } from '../../../domain';
import {
  IImageProcessor,
  ImageUnreadableError,
  TNormalizedImage,
  TProcessedImage,
} from '../image-processor';

/**
 * Test fake: content `bad` is unreadable; anything else becomes `jpeg:<content>`.
 * Images as sent are 1000x800 unless the content is `<w>x<h>`, e.g. `5000x800`.
 */
export class FakeImageProcessor implements IImageProcessor {
  async normalize(data: Buffer): Promise<TNormalizedImage> {
    const content = data.toString();
    if (content === 'bad') {
      throw new ImageUnreadableError('Unsupported image format');
    }
    const size = /^(\d+)x(\d+)$/.exec(content);
    return {
      data: Buffer.from(`jpeg:${content}`),
      mimeType: 'image/jpeg',
      width: 1000,
      height: 800,
      sourceWidth: size ? Number(size[1]) : 1000,
      sourceHeight: size ? Number(size[2]) : 800,
    };
  }

  async crop(image: TProcessedImage, box: TBox): Promise<TProcessedImage> {
    return {
      ...image,
      data: Buffer.from(`crop:${box.x},${box.y}:${image.data.toString()}`),
    };
  }

  async thumbnail(image: TProcessedImage): Promise<TProcessedImage> {
    return { ...image, data: Buffer.from(`thumb:${image.data.toString()}`) };
  }
}
