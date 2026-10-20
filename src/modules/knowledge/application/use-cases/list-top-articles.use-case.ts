import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  CROP_TOP_ARTICLES_REPOSITORY,
  ICropTopArticlesRepository,
} from '../ports/crop-top-articles.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';
import {
  ITopArticleSettingsRepository,
  TOP_ARTICLE_SETTINGS_REPOSITORY,
} from '../ports/top-article-settings.repository';
import {
  TArticleCrop,
  TArticleListItem,
  toArticleListItem,
} from './list-articles.use-case';

export type TListTopArticlesOutput = {
  /** By crop sortOrder; crops without a published top article are left out. */
  crops: Array<{
    crop: TArticleCrop;
    /** In the admin's order, published ones only, at most `limit`. */
    articles: TArticleListItem[];
  }>;
};

/** Top articles of every crop (public). */
@Injectable()
export class ListTopArticlesUseCase {
  constructor(
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(CROP_TOP_ARTICLES_REPOSITORY)
    private readonly topArticles: ICropTopArticlesRepository,
    @Inject(TOP_ARTICLE_SETTINGS_REPOSITORY)
    private readonly settings: ITopArticleSettingsRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async execute(): Promise<TListTopArticlesOutput> {
    const [crops, tops, settings] = await Promise.all([
      this.knowledge.listCrops(),
      this.topArticles.findAll(),
      this.settings.get(),
    ]);
    const idsByCrop = new Map(tops.map((t) => [t.cropType, t.articleIds]));
    const byId = new Map(
      (await this.articles.findByIds(tops.flatMap((t) => t.articleIds))).map(
        (a) => [a.id, a],
      ),
    );
    const groups = crops
      .map((crop) => ({
        crop,
        articles: (idsByCrop.get(crop.code) ?? [])
          .flatMap((id) => {
            const article = byId.get(id);
            return article?.isPublished ? [article] : [];
          })
          .slice(0, settings.limit),
      }))
      .filter((group) => group.articles.length > 0);
    const diseases = await this.knowledge.findDiseasesByCodes(
      groups.flatMap((g) => g.articles.flatMap((a) => a.diseaseCode ?? [])),
    );
    const diseaseByCode = new Map(diseases.map((d) => [d.code, d]));
    return {
      crops: groups.map(({ crop, articles }) => ({
        crop: {
          code: crop.code,
          slug: crop.slug,
          nameVi: crop.nameVi,
          diagnosisEnabled: crop.enabled,
        },
        articles: articles.map((article) =>
          toArticleListItem(article, crop.slug, diseaseByCode, this.storage),
        ),
      })),
    };
  }
}
