import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  Article,
  articleContentIssues,
  articleSlugIssues,
  KnowledgeArticleImageInvalidException,
  KnowledgeArticleAlreadyExistsException,
  KnowledgeArticleInvalidContentException,
  KnowledgeArticleSlugTakenException,
  KnowledgeCropNotFoundException,
  TArticleSource,
} from '../../domain';
import {
  assertArticleAdmin,
  deleteTmpUploads,
  findKbTarget,
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

export type TCreateArticleInput = {
  userId: string;
  /** KB code the article is about: disease code (main article) or variant code. */
  code: string;
  /** Fixed once created; unique within the crop. */
  slug: string;
  title: string;
  summary: string;
  /** Images by file name, links as `/diseases/<CODE>`. */
  markdown: string;
  /** One of `images[].file`. */
  cover: string;
  /** Every image is new: `tmpKey` required. */
  images: TAdminArticleImageInput[];
  sources: TArticleSource[];
};

export type TCreateArticleOutput = { code: string; slug: string; path: string };

/**
 * An admin writes the article of a KB code that has none: origin ADMIN, REVIEWED by the admin,
 * published. A variant article needs the main article of its disease. The content is checked
 * before images are published; TMP uploads are deleted and the client cache revalidated after commit.
 */
@Injectable()
export class CreateArticleUseCase {
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
    this.logger = logger.withContext(CreateArticleUseCase.name);
  }

  async execute(input: TCreateArticleInput): Promise<TCreateArticleOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const { disease, variantCode } = await findKbTarget(
      this.knowledge,
      input.code,
    );
    const crop = await this.knowledge.findCrop(disease.cropType);
    if (!crop) throw new KnowledgeCropNotFoundException(disease.cropType);
    await this.assertCanCreate(
      input,
      disease.cropType,
      variantCode,
      disease.code,
    );

    const kb = kbCodesOf(await this.knowledge.listDiseasesByCrop(crop.code));
    // Checked before publishing images, so a bad request uploads nothing.
    const issues = [
      ...articleSlugIssues(input.slug),
      ...articleContentIssues(
        { ...input, imageFiles: input.images.map((image) => image.file) },
        kb,
        crop.code,
      ),
    ];
    if (issues.length > 0)
      throw new KnowledgeArticleInvalidContentException(issues);

    // A new article has no stored image to keep: each needs an upload.
    const kept = input.images.find((image) => image.tmpKey === undefined);
    if (kept) throw new KnowledgeArticleImageInvalidException(kept.file, null);
    const { images, tmpKeys } = await resolveArticleImages(
      this.imagePublisher,
      {
        uploaderId: input.userId,
        cropType: crop.code,
        code: input.code,
        images: input.images.map(({ tmpKey, ...image }) => ({
          ...image,
          // A new article keeps nothing: every image needs an upload.
          tmpKey: tmpKey ?? '',
        })),
        stored: [],
      },
    );
    const article = Article.createByAdmin(
      {
        cropType: crop.code,
        diseaseCode: disease.code,
        variantCode,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        markdown: input.markdown,
        cover: input.cover,
        images,
        sources: input.sources,
        kbVersion: disease.kbVersion,
      },
      kb,
      input.userId,
    );

    await this.unitOfWork.runInTransaction(async () => {
      await this.assertCanCreate(input, crop.code, variantCode, disease.code);
      await this.articles.replaceArticles([article], []);
    });

    await deleteTmpUploads(this.storage, this.logger, tmpKeys);
    this.revalidateArticles
      .execute({
        upserted: [
          {
            cropSlug: crop.slug,
            slug: article.slug,
            oldSlug: null,
            diseaseCode: article.diseaseCode,
            variantCode: article.variantCode,
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
    return {
      code: input.code,
      slug: article.slug,
      path: article.path(crop.slug),
    };
  }

  private async assertCanCreate(
    input: TCreateArticleInput,
    cropType: string,
    variantCode: string | null,
    diseaseCode: string,
  ): Promise<void> {
    if (await this.articles.findByKbCode(input.code)) {
      throw new KnowledgeArticleAlreadyExistsException(input.code);
    }
    if (variantCode && !(await this.articles.findByKbCode(diseaseCode))) {
      throw new KnowledgeArticleInvalidContentException([
        `variant article needs the main article of ${diseaseCode}`,
      ]);
    }
    if (await this.articles.existsBySlug(cropType, input.slug)) {
      throw new KnowledgeArticleSlugTakenException(cropType, input.slug);
    }
  }
}
