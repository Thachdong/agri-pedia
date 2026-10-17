import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import {
  KnowledgeArticleCodeNotFoundException,
  KnowledgeCropNotFoundException,
} from '../../domain';
import { assertArticleAdmin } from '../admin-article-support';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';

export type TUnpublishArticleInput = {
  userId: string;
  /** KB code of the article: variant code, else disease code. */
  code: string;
};

export type TUnpublishArticleOutput = { code: string; isPublished: boolean };

/**
 * An admin hides an article from the public API (list, page, sitemap, disease links); it stays editable.
 * Already in that state = no-op; otherwise the client cache is revalidated in the background after commit.
 */
@Injectable()
export class UnpublishArticleUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    private readonly revalidateArticles: RevalidateArticlesUseCase,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(UnpublishArticleUseCase.name);
  }

  async execute(
    input: TUnpublishArticleInput,
  ): Promise<TUnpublishArticleOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const article = await this.articles.findByKbCode(input.code);
    if (!article) throw new KnowledgeArticleCodeNotFoundException(input.code);
    const crop = await this.knowledge.findCrop(article.cropType);
    if (!crop) throw new KnowledgeCropNotFoundException(article.cropType);

    if (article.unpublish()) {
      await this.unitOfWork.runInTransaction(() =>
        this.articles.replaceArticles([article], []),
      );
      this.revalidateArticles
        .execute({
          upserted: [
            {
              cropSlug: crop.slug,
              slug: article.slug,
              oldSlug: null,
              diseaseCode: article.diseaseCode,
              variantCode: article.variantCode,
              // Links to it appear / turn into plain text.
              linkChanged: true,
            },
          ],
          deleted: [],
        })
        .catch((error: unknown) =>
          this.logger.error('Article revalidation failed', error, {
            code: input.code,
          }),
        );
    }
    return { code: input.code, isPublished: article.isPublished };
  }
}
