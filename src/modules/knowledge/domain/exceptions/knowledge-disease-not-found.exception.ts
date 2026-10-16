import { DomainException, EDomainErrorType } from '@shared/domain';

/** No disease with this code. */
export class KnowledgeDiseaseNotFoundException extends DomainException {
  constructor(diseaseCode: string) {
    super(
      'KNOWLEDGE_DISEASE_NOT_FOUND',
      `Disease ${diseaseCode} not found`,
      EDomainErrorType.NOT_FOUND,
      { diseaseCode },
    );
  }
}
