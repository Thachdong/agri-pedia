import { DomainException, EDomainErrorType } from '@shared/domain';

/** The top articles chosen for a crop break a rule (too many, duplicated, not a published article of the crop). */
export class KnowledgeTopArticlesInvalidException extends DomainException {
  /** `articles`: the offending article slugs (or ids). */
  constructor(reason: string, articles: string[] = []) {
    super(
      'KNOWLEDGE_TOP_ARTICLES_INVALID',
      `Invalid top articles: ${reason}`,
      EDomainErrorType.VALIDATION,
      { reason, articles },
    );
  }
}
