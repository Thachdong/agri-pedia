import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  EArticleOrigin,
  EArticleStatus,
  KnowledgeArticleCodeNotFoundException,
  KnowledgeCropNotFoundException,
  TArticleImageCredit,
  TArticleSource,
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

export type TGetAdminArticleInput = {
  userId: string;
  /** KB code: variant code, else disease code. */
  code: string;
};

export type TAdminArticleImage = {
  /** File name used in the markdown and `cover`. */
  file: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: TArticleImageCredit;
};

export type TGetAdminArticleOutput = {
  code: string;
  crop: { code: string; slug: string };
  diseaseCode: string | null;
  variantCode: string | null;
  slug: string;
  path: string;
  title: string;
  summary: string;
  /** As stored: image file names and `/diseases/<CODE>` links not resolved (what an edit sends back). */
  markdown: string;
  cover: string | null;
  images: TAdminArticleImage[];
  sources: TArticleSource[];
  status: EArticleStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  origin: EArticleOrigin;
  isPublished: boolean;
  editedBy: string | null;
  kbVersion: string;
  publishedAt: Date;
  updatedAt: Date;
};

/** The stored content of an article for an admin to review or edit, published or not. */
@Injectable()
export class GetAdminArticleUseCase {
  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async execute(input: TGetAdminArticleInput): Promise<TGetAdminArticleOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const article = await this.articles.findByKbCode(input.code);
    if (!article) throw new KnowledgeArticleCodeNotFoundException(input.code);
    const crop = await this.knowledge.findCrop(article.cropType);
    if (!crop) throw new KnowledgeCropNotFoundException(article.cropType);

    return {
      code: input.code,
      crop: { code: crop.code, slug: crop.slug },
      diseaseCode: article.diseaseCode,
      variantCode: article.variantCode,
      slug: article.slug,
      path: article.path(crop.slug),
      title: article.title,
      summary: article.summary,
      markdown: article.markdown,
      cover: article.cover,
      images: article.imagesInOrder().map((image) => ({
        file: image.file,
        url: this.storage.publicUrl(image.key),
        width: image.width,
        height: image.height,
        alt: image.alt,
        caption: image.caption,
        credit: image.credit,
      })),
      sources: article.sources,
      status: article.status,
      reviewedBy: article.reviewedBy,
      reviewedAt: article.reviewedAt,
      origin: article.origin,
      isPublished: article.isPublished,
      editedBy: article.editedBy,
      kbVersion: article.kbVersion,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    };
  }
}
