import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  articleContentIssues,
  EArticleOrigin,
  KnowledgeArticleCodeNotFoundException,
  KnowledgeArticleInvalidContentException,
  KnowledgeCropNotFoundException,
  TArticleSource,
} from '../../domain';
import {
  assertArticleAdmin,
  kbCodesOf,
  resolveArticleImages,
  TAdminArticleImageInput,
} from '../admin-article-support';
import {
  ARTICLE_IMAGE_PUBLISHER,
  IArticleImagePublisher,
} from '../ports/article-image-publisher';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';

export type TUpdateArticleInput = {
  userId: string;
  /** KB code of the article: variant code, else disease code. */
  code: string;
  title: string;
  summary: string;
  markdown: string;
  /** One of `images[].file`. */
  cover: string;
  /** The full image list: an entry without `tmpKey` keeps the stored image of that `file`; images left out are dropped. */
  images: TAdminArticleImageInput[];
  sources: TArticleSource[];
};

export type TUpdateArticleOutput = {
  code: string;
  slug: string;
  path: string;
  origin: EArticleOrigin;
};

/**
 * An admin replaces the content of an article (published or not); slug, crop and KB code stay.
 * The article becomes REVIEWED by the admin, an AI article becomes AI_REVIEWED (the seed stops
 * touching it). Content is checked before new images are published; after commit the TMP uploads
 * are deleted and the client cache revalidated in the background.
 */
@Injectable()
export class UpdateArticleUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(ARTICLE_IMAGE_PUBLISHER)
    private readonly imagePublisher: IArticleImagePublisher,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    private readonly revalidateArticles: RevalidateArticlesUseCase,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(UpdateArticleUseCase.name);
  }

  async execute(input: TUpdateArticleInput): Promise<TUpdateArticleOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const article = await this.articles.findByKbCode(input.code);
    if (!article) throw new KnowledgeArticleCodeNotFoundException(input.code);
    const crop = await this.knowledge.findCrop(article.cropType);
    if (!crop) throw new KnowledgeCropNotFoundException(article.cropType);

    const kb = kbCodesOf(await this.knowledge.listDiseasesByCrop(crop.code));
    // Checked before publishing images, so a bad request uploads nothing.
    const issues = articleContentIssues(
      { ...input, imageFiles: input.images.map((image) => image.file) },
      kb,
      crop.code,
    );
    if (issues.length > 0) {
      throw new KnowledgeArticleInvalidContentException(issues);
    }

    const { images, tmpKeys } = await resolveArticleImages(
      this.imagePublisher,
      {
        uploaderId: input.userId,
        cropType: crop.code,
        code: input.code,
        images: input.images,
        stored: article.images,
      },
    );
    const before = { title: article.title, cover: article.coverImage()?.key };
    article.editContent(
      {
        title: input.title,
        summary: input.summary,
        markdown: input.markdown,
        cover: input.cover,
        images,
        sources: input.sources,
      },
      kb,
      input.userId,
    );

    await this.unitOfWork.runInTransaction(() =>
      this.articles.replaceArticles([article], []),
    );

    await Promise.all(tmpKeys.map((key) => this.storage.deleteFile(key)));
    this.revalidateArticles
      .execute({
        upserted: [
          {
            cropSlug: crop.slug,
            slug: article.slug,
            oldSlug: null,
            diseaseCode: article.diseaseCode,
            variantCode: article.variantCode,
            linkChanged:
              before.title !== article.title ||
              before.cover !== article.coverImage()?.key,
          },
        ],
        deleted: [],
      })
      .catch((error: unknown) =>
        this.logger.error('Article revalidation failed', error, {
          code: input.code,
        }),
      );
    return {
      code: input.code,
      slug: article.slug,
      path: article.path(crop.slug),
      origin: article.origin,
    };
  }
}
