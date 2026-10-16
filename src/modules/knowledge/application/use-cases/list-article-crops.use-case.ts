import { Inject, Injectable } from '@nestjs/common';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListArticleCropsOutput = {
  crops: Array<{
    code: string;
    slug: string;
    nameVi: string;
    diagnosisEnabled: boolean;
    articleCount: number;
  }>;
};

/** Crops with at least one article (diagnosis enabled or not), by sortOrder (public). */
@Injectable()
export class ListArticleCropsUseCase {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
  ) {}

  async execute(): Promise<TListArticleCropsOutput> {
    const [crops, counts] = await Promise.all([
      this.knowledge.listCrops(),
      this.articles.countByCrop(),
    ]);
    return {
      crops: crops
        .filter((crop) => counts.has(crop.code))
        .map((crop) => ({
          code: crop.code,
          slug: crop.slug,
          nameVi: crop.nameVi,
          diagnosisEnabled: crop.enabled,
          articleCount: counts.get(crop.code) ?? 0,
        })),
    };
  }
}
