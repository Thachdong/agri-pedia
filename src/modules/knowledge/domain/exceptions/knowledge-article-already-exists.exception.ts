import { DomainException, EDomainErrorType } from '@shared/domain';

/** The KB code (disease or variant) already has an article. */
export class KnowledgeArticleAlreadyExistsException extends DomainException {
  constructor(code: string) {
    super(
      'KNOWLEDGE_ARTICLE_ALREADY_EXISTS',
      `${code} already has an article`,
      EDomainErrorType.CONFLICT,
      { code },
    );
  }
}
