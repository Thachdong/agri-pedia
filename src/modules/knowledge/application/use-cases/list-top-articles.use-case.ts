import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { KnowledgeCropNotFoundException } from '../../domain';
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

export type TListTopArticlesInput = {
  /** Crop.slug. */
  crop: string;
};

export type TListTopArticlesOutput = {
  crop: TArticleCrop;
  /** In the admin's order, published ones only, at most `limit`. */
  articles: TArticleListItem[];
};

/** Top articles of a crop (public). */
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

  async execute(input: TListTopArticlesInput): Promise<TListTopArticlesOutput> {
    const crop = await this.knowledge.findCropBySlug(input.crop);
    if (!crop) throw new KnowledgeCropNotFoundException(input.crop);
    const [top, settings] = await Promise.all([
      this.topArticles.findByCrop(crop.code),
      this.settings.get(),
    ]);
    const byId = new Map(
      (await this.articles.findByIds(top.articleIds)).map((a) => [a.id, a]),
    );
    const articles = top.articleIds
      .flatMap((id) => {
        const article = byId.get(id);
        return article?.isPublished ? [article] : [];
      })
      .slice(0, settings.limit);
    const diseases = await this.knowledge.findDiseasesByCodes(
      articles.flatMap((article) => article.diseaseCode ?? []),
    );
    const diseaseByCode = new Map(diseases.map((d) => [d.code, d]));
    return {
      crop: {
        code: crop.code,
        slug: crop.slug,
        nameVi: crop.nameVi,
        diagnosisEnabled: crop.enabled,
      },
      articles: articles.map((article) =>
        toArticleListItem(article, crop.slug, diseaseByCode, this.storage),
      ),
    };
  }
}
