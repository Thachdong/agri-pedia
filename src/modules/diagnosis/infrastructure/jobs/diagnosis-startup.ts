import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ILogger, LOGGER } from '@shared/logger';
import { FailStaleDiagnosesUseCase } from '../../application/use-cases';

/** On start, fails diagnoses left PROCESSING by a previous run (their images were in memory). */
@Injectable()
export class DiagnosisStartup implements OnApplicationBootstrap {
  private readonly logger: ILogger;

  constructor(
    private readonly failStaleDiagnoses: FailStaleDiagnosesUseCase,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(DiagnosisStartup.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const { failedCount } = await this.failStaleDiagnoses.execute();
    if (failedCount > 0) {
      this.logger.warn('Stale diagnoses failed at startup', { failedCount });
    }
  }
}
