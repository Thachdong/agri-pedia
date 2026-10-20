import { DomainException, EDomainErrorType } from '@shared/domain';

/** The top articles limit is out of its allowed range. */
export class KnowledgeInvalidTopArticleSettingsException extends DomainException {
  constructor(limit: number, min: number, max: number) {
    super(
      'KNOWLEDGE_INVALID_TOP_ARTICLE_SETTINGS',
      `Top articles limit must be an integer in ${min}..${max}, got ${limit}`,
      EDomainErrorType.VALIDATION,
      { limit, min, max },
    );
  }
}
