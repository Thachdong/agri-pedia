import {
  IImageQualityInspector,
  TImageQuality,
} from '../image-quality-inspector';

/** Returns `quality` for every image; `fail` makes inspect throw. */
export class FakeImageQualityInspector implements IImageQualityInspector {
  quality: TImageQuality = {
    width: 2048,
    height: 1536,
    sharpness: 2,
    brightness: 128,
  };
  fail = false;

  async inspect(): Promise<TImageQuality> {
    if (this.fail) throw new Error('Unreadable image');
    return this.quality;
  }
}
