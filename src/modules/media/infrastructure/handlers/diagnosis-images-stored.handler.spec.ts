import { createIntegrationEvent } from '@shared/event-bus';
import { DIAGNOSIS_IMAGES_STORED_EVENT } from '@modules/diagnosis/contracts';
import { RegisterStoredMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';
import { DiagnosisImagesStoredHandler } from './diagnosis-images-stored.handler';

describe('DiagnosisImagesStoredHandler', () => {
  it('records the stored diagnosis images as DIAGNOSIS media', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const handler = new DiagnosisImagesStoredHandler({
      execute,
    } as unknown as RegisterStoredMediaUseCase);

    await handler.handle(
      createIntegrationEvent(DIAGNOSIS_IMAGES_STORED_EVENT, {
        diagnosisId: 'd1',
        userId: 'u1',
        files: [
          {
            mediaId: 'm1',
            key: 'diagnoses/d1/m1.jpg',
            extension: 'jpg' as const,
            filename: 'image-1.jpg',
            sortOrder: 0,
          },
        ],
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      ownerType: EMediaOwnerType.DIAGNOSIS,
      ownerId: 'd1',
      files: [
        {
          mediaId: 'm1',
          key: 'diagnoses/d1/m1.jpg',
          type: EMediaType.IMAGE,
          extension: 'jpg',
          filename: 'image-1.jpg',
          sortOrder: 0,
        },
      ],
    });
  });
});
