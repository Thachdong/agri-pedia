import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  DIAGNOSIS_CASE_COMPLETED_EVENT,
  TDiagnosisCaseCompletedEvent,
} from '@modules/diagnosis/contracts';
import { CollectTrainingSamplesUseCase } from '../../application/use-cases';

/** Keeps the unambiguous HIGH-confidence images of a completed diagnosis as training samples (best-effort). */
@Injectable()
export class DiagnosisCaseCompletedHandler {
  constructor(
    private readonly collectTrainingSamples: CollectTrainingSamplesUseCase,
  ) {}

  @OnIntegrationEvent(DIAGNOSIS_CASE_COMPLETED_EVENT)
  async handle(event: TDiagnosisCaseCompletedEvent): Promise<void> {
    const { payload } = event;
    await this.collectTrainingSamples.execute({
      diagnosisId: payload.diagnosisId,
      cropType: payload.cropType,
      provider: payload.provider,
      model: payload.model,
      promptVersion: payload.promptVersion,
      kbVersion: payload.kbVersion,
      conflict: payload.conflict,
      images: payload.images,
    });
  }
}
