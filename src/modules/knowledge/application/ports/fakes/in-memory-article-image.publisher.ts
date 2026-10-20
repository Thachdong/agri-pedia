import {
  IArticleImagePublisher,
  TPublishArticleImageInput,
  TPublishedArticleImage,
} from '../article-image-publisher';

/** Test fake: knows the uploads added with `upload()`; publishes them as `<keyPrefix>.fake0001.webp`. */
export class InMemoryArticleImagePublisher implements IArticleImagePublisher {
  readonly uploads = new Map<string, { width: number; height: number }>();
  readonly published: TPublishArticleImageInput[] = [];

  upload(tmpKey: string, width = 1200, height = 800): this {
    this.uploads.set(tmpKey, { width, height });
    return this;
  }

  async publish(
    input: TPublishArticleImageInput,
  ): Promise<TPublishedArticleImage | null> {
    const upload = this.uploads.get(input.tmpKey);
    if (!upload) return null;
    this.published.push(input);
    return { key: `${input.keyPrefix}.fake0001.webp`, ...upload };
  }
}
