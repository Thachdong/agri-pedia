import { DomainException, EDomainErrorType } from '@shared/domain';

/** The KB code (disease or variant) has no article. Same code as KnowledgeArticleNotFoundException. */
export class KnowledgeArticleCodeNotFoundException extends DomainException {
  constructor(code: string) {
    super(
      'KNOWLEDGE_ARTICLE_NOT_FOUND',
      `${code} has no article`,
      EDomainErrorType.NOT_FOUND,
      { code },
    );
  }
}
