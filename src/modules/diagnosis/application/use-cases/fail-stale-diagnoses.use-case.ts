import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IRealtimePublisher, REALTIME_PUBLISHER } from '@shared/realtime';
import { Diagnosis } from '../../domain';
import {
  DIAGNOSIS_REPOSITORY,
  IDiagnosisRepository,
} from '../ports/diagnosis.repository';
import { DIAGNOSIS_COMPLETED_REALTIME_EVENT } from './process-diagnosis.use-case';

export type TFailStaleDiagnosesOutput = { failedCount: number };

/** A diagnosis still PROCESSING after this many AI timeouts lost its in-memory images (e.g. restart). */
const STALE_TIMEOUT_FACTOR = 3;

/** Run at startup: PROCESSING diagnoses older than 3x the AI timeout become FAILED. */
@Injectable()
export class FailStaleDiagnosesUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: IDiagnosisRepository,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: IRealtimePublisher,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(now: Date = new Date()): Promise<TFailStaleDiagnosesOutput> {
    const { timeoutMs } = this.config.get('diagnosis');
    const before = new Date(now.getTime() - timeoutMs * STALE_TIMEOUT_FACTOR);

    const failed: Diagnosis[] = await this.unitOfWork.runInTransaction(
      async () => {
        const stale = await this.diagnoses.findProcessingCreatedBefore(before);
        for (const diagnosis of stale) {
          diagnosis.fail('Processing interrupted (stale at startup)', now);
          await this.diagnoses.save(diagnosis);
        }
        return stale;
      },
    );

    for (const diagnosis of failed) {
      this.realtime.emitToUser(
        diagnosis.userId,
        DIAGNOSIS_COMPLETED_REALTIME_EVENT,
        { id: diagnosis.id, status: diagnosis.status },
      );
    }
    return { failedCount: failed.length };
  }
}
