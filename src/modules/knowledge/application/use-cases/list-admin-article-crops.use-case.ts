import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { assertArticleAdmin } from '../admin-article-support';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListAdminArticleCropsInput = { userId: string };

export type TAdminArticleCrop = {
  code: string;
  /** Value for `cropSlug` of the admin article list. */
  slug: string;
  nameVi: string;
  diagnosisEnabled: boolean;
  /** KB entries an article can be about: diseases + their variants. */
  targetCount: number;
  /** Articles of the crop, published or not. */
  articleCount: number;
  /** Published articles. */
  publishedCount: number;
};

export type TListAdminArticleCropsOutput = { crops: TAdminArticleCrop[] };

/** Every crop (enabled or not, with or without articles) by sortOrder, with article counts (admin). */
@Injectable()
export class ListAdminArticleCropsUseCase {
  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
  ) {}

  async execute(
    input: TListAdminArticleCropsInput,
  ): Promise<TListAdminArticleCropsOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const crops = await this.knowledge.listCrops();
    return {
      crops: await Promise.all(
        crops.map(async (crop) => {
          const [diseases, articles] = await Promise.all([
            this.knowledge.listDiseasesByCrop(crop.code),
            this.articles.listByCrop(crop.code),
          ]);
          return {
            code: crop.code,
            slug: crop.slug,
            nameVi: crop.nameVi,
            diagnosisEnabled: crop.enabled,
            targetCount: diseases.reduce(
              (count, disease) => count + 1 + disease.content.variants.length,
              0,
            ),
            articleCount: articles.length,
            publishedCount: articles.filter((a) => a.isPublished).length,
          };
        }),
      ),
    };
  }
}
