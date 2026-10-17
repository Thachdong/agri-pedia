import { DomainException, EDomainErrorType } from '@shared/domain';

/** The article content breaks the article rules (see articleContentIssues). */
export class KnowledgeArticleInvalidContentException extends DomainException {
  constructor(issues: string[]) {
    super(
      'KNOWLEDGE_ARTICLE_INVALID_CONTENT',
      `Invalid article content: ${issues.join('; ')}`,
      EDomainErrorType.VALIDATION,
      { issues },
    );
  }
}
