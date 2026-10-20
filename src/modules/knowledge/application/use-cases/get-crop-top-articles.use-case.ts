import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { Crop, KnowledgeCropNotFoundException } from '../../domain';
import { assertArticleAdmin } from '../admin-article-support';
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
  TAdminArticleSummary,
  toAdminArticleSummary,
} from './list-admin-article-targets.use-case';

export type TGetCropTopArticlesInput = {
  userId: string;
  /** Crop.slug. */
  cropSlug: string;
};

export type TCropTopArticlesOutput = {
  crop: { code: string; slug: string; nameVi: string };
  /** Top articles an admin may choose per crop. */
  limit: number;
  /** In order, unpublished ones included (hidden from the public list). */
  articles: TAdminArticleSummary[];
};

/** Top articles of a crop as the admin chose them. */
@Injectable()
export class GetCropTopArticlesUseCase {
  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(CROP_TOP_ARTICLES_REPOSITORY)
    private readonly topArticles: ICropTopArticlesRepository,
    @Inject(TOP_ARTICLE_SETTINGS_REPOSITORY)
    private readonly settings: ITopArticleSettingsRepository,
  ) {}

  async execute(
    input: TGetCropTopArticlesInput,
  ): Promise<TCropTopArticlesOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const crop = await this.knowledge.findCropBySlug(input.cropSlug);
    if (!crop) throw new KnowledgeCropNotFoundException(input.cropSlug);
    const [top, settings] = await Promise.all([
      this.topArticles.findByCrop(crop.code),
      this.settings.get(),
    ]);
    return cropTopArticlesOutput(
      crop,
      settings.limit,
      top.articleIds,
      this.articles,
    );
  }
}

/** Output of the admin top articles of `crop`, articles in `articleIds` order. */
export async function cropTopArticlesOutput(
  crop: Crop,
  limit: number,
  articleIds: string[],
  articles: IArticleRepository,
): Promise<TCropTopArticlesOutput> {
  const byId = new Map(
    (await articles.findByIds(articleIds)).map((a) => [a.id, a]),
  );
  return {
    crop: { code: crop.code, slug: crop.slug, nameVi: crop.nameVi },
    limit,
    articles: articleIds.flatMap((id) => {
      const article = byId.get(id);
      return article ? [toAdminArticleSummary(article, crop.slug)] : [];
    }),
  };
}
