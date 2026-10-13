import {
  IImageProcessor,
  ImageUnreadableError,
  TProcessedImage,
} from '../image-processor';

/** Test fake: content `bad` is unreadable; anything else becomes `jpeg:<content>`. */
export class FakeImageProcessor implements IImageProcessor {
  async normalize(data: Buffer): Promise<TProcessedImage> {
    if (data.toString() === 'bad') {
      throw new ImageUnreadableError('Unsupported image format');
    }
    return {
      data: Buffer.from(`jpeg:${data.toString()}`),
      mimeType: 'image/jpeg',
      width: 1000,
      height: 800,
    };
  }
}
