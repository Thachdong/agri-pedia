import { IProductNameReader, TProductPhoto } from '../product-name-reader';

/** Returns `name` (null = unreadable) or throws `error`; records the photos read. */
export class FakeProductNameReader implements IProductNameReader {
  name: string | null = null;
  error: Error | null = null;
  readonly photos: TProductPhoto[] = [];

  async read(photo: TProductPhoto): Promise<string | null> {
    this.photos.push(photo);
    if (this.error) {
      throw this.error;
    }
    return this.name;
  }
}
