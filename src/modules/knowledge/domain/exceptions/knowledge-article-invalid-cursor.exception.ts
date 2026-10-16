import { DomainException, EDomainErrorType } from '@shared/domain';

/** Article list cursor is malformed. */
export class KnowledgeArticleInvalidCursorException extends DomainException {
  constructor() {
    super(
      'KNOWLEDGE_ARTICLE_INVALID_CURSOR',
      'Invalid article cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
