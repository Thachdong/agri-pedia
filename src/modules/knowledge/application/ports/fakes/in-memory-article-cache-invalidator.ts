import { IArticleCacheInvalidator } from '../article-cache-invalidator';

export class InMemoryArticleCacheInvalidator implements IArticleCacheInvalidator {
  /** Tags of each invalidate call. */
  readonly calls: string[][] = [];

  async invalidate(tags: string[]): Promise<void> {
    this.calls.push(tags);
  }
}
