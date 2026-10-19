import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  KnowledgeCropNotFoundException,
  KnowledgeTopArticlesInvalidException,
} from '../../domain';
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
  cropTopArticlesOutput,
  TCropTopArticlesOutput,
} from './get-crop-top-articles.use-case';

export type TSetCropTopArticlesInput = {
  userId: string;
  /** Crop.slug. */
  cropSlug: string;
  /** Article slugs of the crop, first = top; empty clears the list. */
  articleSlugs: string[];
};

/**
 * Replaces the top articles of a crop: at most `limit` published articles of the crop, no duplicates;
 * KnowledgeTopArticlesInvalid otherwise.
 */
@Injectable()
export class SetCropTopArticlesUseCase {
  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(CROP_TOP_ARTICLES_REPOSITORY)
    private readonly topArticles: ICropTopArticlesRepository,
    @Inject(TOP_ARTICLE_SETTINGS_REPOSITORY)
    private readonly settings: ITopArticleSettingsRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TSetCropTopArticlesInput,
  ): Promise<TCropTopArticlesOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const crop = await this.knowledge.findCropBySlug(input.cropSlug);
    if (!crop) throw new KnowledgeCropNotFoundException(input.cropSlug);

    const { limit, articleIds } = await this.unitOfWork.runInTransaction(
      async () => {
        const settings = await this.settings.get();
        const bySlug = new Map(
          (await this.articles.listByCrop(crop.code)).map((a) => [a.slug, a]),
        );
        const unknown = input.articleSlugs.filter((slug) => !bySlug.has(slug));
        if (unknown.length > 0) {
          throw new KnowledgeTopArticlesInvalidException(
            `not articles of crop ${crop.code}`,
            unknown,
          );
        }
        const hidden = input.articleSlugs.filter(
          (slug) => !bySlug.get(slug)?.isPublished,
        );
        if (hidden.length > 0) {
          throw new KnowledgeTopArticlesInvalidException(
            'unpublished articles',
            hidden,
          );
        }
        const duplicated = input.articleSlugs.filter(
          (slug, index) => input.articleSlugs.indexOf(slug) !== index,
        );
        if (duplicated.length > 0) {
          throw new KnowledgeTopArticlesInvalidException(
            'duplicated articles',
            [...new Set(duplicated)],
          );
        }
        const top = await this.topArticles.findByCrop(crop.code);
        top.replace(
          input.articleSlugs.map((slug) => bySlug.get(slug)!.id),
          settings.limit,
        );
        await this.topArticles.save(top);
        return { limit: settings.limit, articleIds: top.articleIds };
      },
    );
    return cropTopArticlesOutput(crop, limit, articleIds, this.articles);
  }
}
