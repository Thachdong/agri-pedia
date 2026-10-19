import { KnowledgeInvalidTopArticleSettingsException } from '../exceptions/knowledge-invalid-top-article-settings.exception';

export const TOP_ARTICLES_LIMIT_BOUNDS = { min: 1, max: 50 } as const;
export const DEFAULT_TOP_ARTICLES_LIMIT = 10;

export type TTopArticleSettingsProps = {
  /** Top articles an admin may choose per crop. */
  limit: number;
};

/** App-wide settings of the top articles (one per app). */
export class TopArticleSettings {
  private constructor(private props: TTopArticleSettingsProps) {}

  /** Settings used until an admin saves some. */
  static defaults(): TopArticleSettings {
    return new TopArticleSettings({ limit: DEFAULT_TOP_ARTICLES_LIMIT });
  }

  static restore(props: TTopArticleSettingsProps): TopArticleSettings {
    return new TopArticleSettings({ ...props });
  }

  /** Throws KnowledgeInvalidTopArticleSettings out of 1..50. Lists already longer stay as they are. */
  changeLimit(limit: number): void {
    const { min, max } = TOP_ARTICLES_LIMIT_BOUNDS;
    if (!Number.isInteger(limit) || limit < min || limit > max) {
      throw new KnowledgeInvalidTopArticleSettingsException(limit, min, max);
    }
    this.props = { limit };
  }

  get limit(): number {
    return this.props.limit;
  }
}
