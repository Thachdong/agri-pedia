import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ILogger, LOGGER } from '@shared/logger';
import {
  RevalidateArticlesUseCase,
  SeedArticlesUseCase,
  SeedKnowledgeBaseUseCase,
} from '../../application/use-cases';

/**
 * Seeds the KB tables, then the articles, from the shipped crop packs on every app start (idempotent).
 * Changed article pages are revalidated on the client once the HTTP server listens
 * (the client regenerates them by calling this server); never blocks the bootstrap.
 */
@Injectable()
export class KnowledgeSeeder implements OnApplicationBootstrap {
  private readonly logger: ILogger;

  constructor(
    private readonly seedKnowledgeBase: SeedKnowledgeBaseUseCase,
    private readonly seedArticles: SeedArticlesUseCase,
    private readonly revalidateArticles: RevalidateArticlesUseCase,
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(KnowledgeSeeder.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const kb = await this.seedKnowledgeBase.execute();
    this.logger.info('Knowledge base seeded', kb);
    const articles = await this.seedArticles.execute();
    this.logger.info('Articles seeded', articles);
    if (articles.upserted.length === 0 && articles.deleted.length === 0) {
      return;
    }

    // listen$ completes after `app.listen()`; never emits in tests that only `init()`.
    this.httpAdapterHost.listen$.subscribe({
      complete: () => {
        this.revalidateArticles.execute(articles).catch((error: unknown) => {
          this.logger.error('Article revalidation failed', error);
        });
      },
    });
  }
}
