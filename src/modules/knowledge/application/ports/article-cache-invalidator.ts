/**
 * Drops cached article pages on the client by cache tag. Best effort: failures are retried and
 * logged by the adapter, never thrown (pages also expire on their own).
 */
export interface IArticleCacheInvalidator {
  invalidate(tags: string[]): Promise<void>;
}

export const ARTICLE_CACHE_INVALIDATOR = Symbol('ARTICLE_CACHE_INVALIDATOR');
