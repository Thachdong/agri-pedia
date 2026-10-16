import { Inject, Injectable } from '@nestjs/common';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TGetArticleSitemapOutput = {
  /** Crops with a REVIEWED article; updatedAt = latest of their articles. */
  crops: Array<{ slug: string; updatedAt: Date }>;
  articles: Array<{ path: string; updatedAt: Date }>;
};

/** Every indexable (REVIEWED) article, unpaginated (public). */
@Injectable()
export class GetArticleSitemapUseCase {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(): Promise<TGetArticleSitemapOutput> {
    const [crops, articles] = await Promise.all([
      this.knowledge.listCrops(),
      this.articles.listIndexable(),
    ]);
    const latest = new Map<string, Date>();
    for (const article of articles) {
      const current = latest.get(article.cropType);
      if (!current || article.updatedAt > current) {
        latest.set(article.cropType, article.updatedAt);
      }
    }
    const slugOf = new Map(crops.map((crop) => [crop.code, crop.slug]));

    return {
      crops: crops.flatMap((crop) => {
        const updatedAt = latest.get(crop.code);
        return updatedAt ? [{ slug: crop.slug, updatedAt }] : [];
      }),
      articles: articles
        .filter((article) => slugOf.has(article.cropType))
        .map((article) => ({
          path: article.path(slugOf.get(article.cropType) as string),
          updatedAt: article.updatedAt,
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    };
  }
}
