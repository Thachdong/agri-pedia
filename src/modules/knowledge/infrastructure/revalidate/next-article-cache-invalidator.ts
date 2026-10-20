import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ILogger, LOGGER } from '@shared/logger';
import { IArticleCacheInvalidator } from '../../application/ports';

const TIMEOUT_MS = 5000;
/** Waits before each retry after the first attempt. */
export const RETRY_DELAYS_MS = [5000, 15000, 45000];

/**
 * Calls the Next.js revalidate webhook: `POST {articleRevalidateUrl}` with `x-revalidate-secret`
 * and `{ tags }`. Retries errors / non-2xx, then logs a warning (pages expire on their own).
 * No URL configured → skipped.
 */
@Injectable()
export class NextArticleCacheInvalidator implements IArticleCacheInvalidator {
  private readonly logger: ILogger;
  private readonly url: string | undefined;
  private readonly secret: string | undefined;

  constructor(
    @Inject(CONFIG_SERVICE) config: IConfigService,
    @Inject(LOGGER) logger: ILogger,
  ) {
    const knowledge = config.get('knowledge');
    this.url = knowledge.articleRevalidateUrl;
    this.secret = knowledge.articleRevalidateSecret;
    this.logger = logger.withContext(NextArticleCacheInvalidator.name);
  }

  async invalidate(tags: string[]): Promise<void> {
    if (!this.url) {
      this.logger.info('Article revalidation skipped: no URL configured', {
        tags,
      });
      return;
    }
    let lastError = '';
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (attempt > 0) await this.wait(RETRY_DELAYS_MS[attempt - 1]);
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-revalidate-secret': this.secret ?? '',
          },
          body: JSON.stringify({ tags }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.ok) {
          this.logger.info('Article pages revalidated', { tags, attempt });
          return;
        }
        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    this.logger.warn('Article revalidation failed', { tags, lastError });
  }

  /** Overridden in tests. */
  protected wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
