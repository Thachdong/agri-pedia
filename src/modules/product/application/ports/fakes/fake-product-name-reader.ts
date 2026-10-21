import { IProductNameReader, TProductPhoto } from '../product-name-reader';

/** Returns `name` (null = unreadable) or throws `error`; records the photos read and the models used. */
export class FakeProductNameReader implements IProductNameReader {
  name: string | null = null;
  error: Error | null = null;
  readonly photos: TProductPhoto[] = [];
  readonly models: string[] = [];

  async read(photo: TProductPhoto, model: string): Promise<string | null> {
    this.photos.push(photo);
    this.models.push(model);
    if (this.error) {
      throw this.error;
    }
    return this.name;
  }
}
