import { Injectable } from '@nestjs/common';
import { OnIntegrationEvent } from '@shared/event-bus';
import {
  DIAGNOSIS_IMAGES_STORED_EVENT,
  TDiagnosisImagesStoredEvent,
} from '@modules/diagnosis/contracts';
import { RegisterStoredMediaUseCase } from '../../application/use-cases';
import { EMediaOwnerType, EMediaType } from '../../domain';

@Injectable()
export class DiagnosisImagesStoredHandler {
  constructor(
    private readonly registerStoredMedia: RegisterStoredMediaUseCase,
  ) {}

  @OnIntegrationEvent(DIAGNOSIS_IMAGES_STORED_EVENT)
  async handle(event: TDiagnosisImagesStoredEvent): Promise<void> {
    await this.registerStoredMedia.execute({
      ownerType: EMediaOwnerType.DIAGNOSIS,
      ownerId: event.payload.diagnosisId,
      files: event.payload.files.map((file) => ({
        mediaId: file.mediaId,
        key: file.key,
        type: EMediaType.IMAGE,
        extension: file.extension,
        filename: file.filename,
        sortOrder: file.sortOrder,
      })),
    });
  }
}
