import { DomainException, EDomainErrorType } from '@shared/domain';

/** No article with this slug in the crop. */
export class KnowledgeArticleNotFoundException extends DomainException {
  constructor(cropSlug: string, slug: string) {
    super(
      'KNOWLEDGE_ARTICLE_NOT_FOUND',
      `Article ${cropSlug}/${slug} not found`,
      EDomainErrorType.NOT_FOUND,
      { cropSlug, slug },
    );
  }
}
