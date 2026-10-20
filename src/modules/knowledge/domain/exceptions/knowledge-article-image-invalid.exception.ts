import { DomainException, EDomainErrorType } from '@shared/domain';

/** A new article image is not an uploaded file of the caller, or is not a readable image. */
export class KnowledgeArticleImageInvalidException extends DomainException {
  constructor(file: string, tmpKey: string | null) {
    super(
      'KNOWLEDGE_ARTICLE_IMAGE_INVALID',
      `Image ${file} is not an uploaded image of yours`,
      EDomainErrorType.VALIDATION,
      { file, tmpKey },
    );
  }
}
