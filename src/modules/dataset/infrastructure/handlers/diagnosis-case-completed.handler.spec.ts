import { createIntegrationEvent } from '@shared/event-bus';
import {
  DIAGNOSIS_CASE_COMPLETED_EVENT,
  TDiagnosisCaseCompletedEventPayload,
} from '@modules/diagnosis/contracts';
import { CollectTrainingSamplesUseCase } from '../../application/use-cases';
import { DiagnosisCaseCompletedHandler } from './diagnosis-case-completed.handler';

describe('DiagnosisCaseCompletedHandler', () => {
  it('collects training samples from the completed diagnosis', async () => {
    const execute = jest.fn().mockResolvedValue({ sampleIds: [] });
    const handler = new DiagnosisCaseCompletedHandler({
      execute,
    } as unknown as CollectTrainingSamplesUseCase);
    const images: TDiagnosisCaseCompletedEventPayload['images'] = [
      {
        sortOrder: 0,
        key: 'diagnoses/d1/m1.jpg',
        plantPart: 'LEAF',
        detectedPart: 'LEAF',
        diseases: [
          {
            diseaseCode: 'RICE_BLAST',
            variantCode: null,
            level: 'HIGH',
            score: 0.9,
          },
        ],
        regions: [
          {
            box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
            diseaseCode: 'RICE_BLAST',
            level: 'HIGH',
            score: 0.9,
          },
        ],
      },
    ];

    await handler.handle(
      createIntegrationEvent(DIAGNOSIS_CASE_COMPLETED_EVENT, {
        diagnosisId: 'd1',
        cropType: 'RICE',
        provider: 'GEMINI',
        model: 'm',
        promptVersion: 'p',
        kbVersion: 'k',
        conflict: false,
        images,
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      diagnosisId: 'd1',
      cropType: 'RICE',
      provider: 'GEMINI',
      model: 'm',
      promptVersion: 'p',
      kbVersion: 'k',
      conflict: false,
      images,
    });
  });
});
