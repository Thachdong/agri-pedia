import { DomainException, EDomainErrorType } from '@shared/domain';

/** No crop with this code. */
export class KnowledgeCropNotFoundException extends DomainException {
  constructor(cropCode: string) {
    super(
      'KNOWLEDGE_CROP_NOT_FOUND',
      `Crop ${cropCode} not found`,
      EDomainErrorType.NOT_FOUND,
      { cropCode },
    );
  }
}
