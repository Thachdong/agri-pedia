import { DomainException, EDomainErrorType } from '@shared/domain';

/** Another article of the crop uses the slug. */
export class KnowledgeArticleSlugTakenException extends DomainException {
  constructor(cropType: string, slug: string) {
    super(
      'KNOWLEDGE_ARTICLE_SLUG_TAKEN',
      `Slug ${slug} is already used in ${cropType}`,
      EDomainErrorType.CONFLICT,
      { cropType, slug },
    );
  }
}
