import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ILogger, LOGGER } from '@shared/logger';
import { SeedKnowledgeBaseUseCase } from '../../application/use-cases';

/** Seeds the KB tables from the shipped JSON on every app start (idempotent). */
@Injectable()
export class KnowledgeSeeder implements OnApplicationBootstrap {
  private readonly logger: ILogger;

  constructor(
    private readonly seedKnowledgeBase: SeedKnowledgeBaseUseCase,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(KnowledgeSeeder.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.seedKnowledgeBase.execute();
    this.logger.info('Knowledge base seeded', result);
  }
}
