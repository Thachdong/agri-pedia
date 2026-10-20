import { KnowledgeTopArticlesInvalidException } from '../exceptions/knowledge-top-articles-invalid.exception';

export type TCropTopArticlesProps = {
  cropType: string;
  /** Article ids, first = top. */
  articleIds: string[];
};

/** Articles an admin put on top for a crop, in order. */
export class CropTopArticles {
  private constructor(private props: TCropTopArticlesProps) {}

  /** No top articles yet. */
  static empty(cropType: string): CropTopArticles {
    return new CropTopArticles({ cropType, articleIds: [] });
  }

  static restore(props: TCropTopArticlesProps): CropTopArticles {
    return new CropTopArticles({ ...props, articleIds: [...props.articleIds] });
  }

  /** Replaces the list; at most `limit` ids, no duplicates. Throws KnowledgeTopArticlesInvalid. */
  replace(articleIds: string[], limit: number): void {
    if (articleIds.length > limit) {
      throw new KnowledgeTopArticlesInvalidException(
        `at most ${limit} articles, got ${articleIds.length}`,
      );
    }
    const duplicated = articleIds.filter(
      (id, index) => articleIds.indexOf(id) !== index,
    );
    if (duplicated.length > 0) {
      throw new KnowledgeTopArticlesInvalidException('duplicated articles', [
        ...new Set(duplicated),
      ]);
    }
    this.props = { ...this.props, articleIds: [...articleIds] };
  }

  get cropType(): string {
    return this.props.cropType;
  }

  get articleIds(): string[] {
    return [...this.props.articleIds];
  }
}
