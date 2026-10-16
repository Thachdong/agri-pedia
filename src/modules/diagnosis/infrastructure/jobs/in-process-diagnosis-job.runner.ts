import { Inject, Injectable } from '@nestjs/common';
import { ILogger, LOGGER } from '@shared/logger';
import { IDiagnosisJobRunner, TDiagnosisJob } from '../../application/ports';
import { ProcessDiagnosisUseCase } from '../../application/use-cases';

/**
 * Runs the pipeline in this process without awaiting it. Images live only in memory:
 * a restart loses them, and the diagnosis is failed as stale on the next start.
 */
@Injectable()
export class InProcessDiagnosisJobRunner implements IDiagnosisJobRunner {
  private readonly logger: ILogger;

  constructor(
    private readonly processDiagnosis: ProcessDiagnosisUseCase,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(InProcessDiagnosisJobRunner.name);
  }

  start(job: TDiagnosisJob): void {
    void this.processDiagnosis.execute(job).then(
      (result) =>
        this.logger.info('Diagnosis processed', {
          diagnosisId: job.diagnosisId,
          status: result.status,
        }),
      (error) =>
        this.logger.error('Diagnosis processing crashed', error, {
          diagnosisId: job.diagnosisId,
        }),
    );
  }
}
