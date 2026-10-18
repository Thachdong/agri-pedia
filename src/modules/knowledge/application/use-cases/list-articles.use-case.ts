import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  EArticleOrigin,
  EArticleStatus,
  EDiseaseCategory,
  KnowledgeArticleInvalidCursorException,
  KnowledgeCropNotFoundException,
} from '../../domain';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
  TArticlePageKey,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TListArticlesInput = {
  /** Crop.slug. */
  crop: string;
  category?: EDiseaseCategory;
  /** `nextCursor` of the previous page; omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TArticleCrop = {
  code: string;
  slug: string;
  nameVi: string;
  diagnosisEnabled: boolean;
};

export type TArticleListItem = {
  path: string;
  slug: string;
  title: string;
  summary: string;
  /** Public URL of the cover image; null without a cover. */
  coverUrl: string | null;
  status: EArticleStatus;
  /** AI = generated ("Nội dung được tạo bởi AI"); ADMIN / AI_REVIEWED = written or edited by an admin ("Nội dung được kiểm duyệt bởi Admin"). */
  origin: EArticleOrigin;
  updatedAt: Date;
  disease: {
    code: string;
    nameVi: string;
    scientificName: string | null;
    category: EDiseaseCategory;
  } | null;
  /** Set for an article about one variant of the disease. */
  variant: { code: string; name: string } | null;
};

export type TListArticlesOutput = {
  crop: TArticleCrop;
  articles: TArticleListItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Opaque cursor: base64url JSON `{ t: title, i: id }`. */
const encodeCursor = (key: TArticlePageKey): string =>
  Buffer.from(JSON.stringify({ t: key.title, i: key.id })).toString(
    'base64url',
  );

const decodeCursor = (cursor: string): TArticlePageKey => {
  try {
    const { t, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (typeof t !== 'string' || typeof i !== 'string' || !UUID.test(i)) {
      throw new Error('bad cursor');
    }
    return { title: t, id: i };
  } catch {
    throw new KnowledgeArticleInvalidCursorException();
  }
};

/** Article summaries of a crop by title, DRAFT included (the client sets noindex); keyset-paginated (public). */
@Injectable()
export class ListArticlesUseCase {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async execute(input: TListArticlesInput): Promise<TListArticlesOutput> {
    const after =
      input.cursor !== undefined ? decodeCursor(input.cursor) : undefined;
    const crop = await this.knowledge.findCropBySlug(input.crop);
    if (!crop) throw new KnowledgeCropNotFoundException(input.crop);

    const diseaseCodes = input.category
      ? (await this.knowledge.listDiseasesByCrop(crop.code))
          .filter((disease) => disease.category === input.category)
          .map((disease) => disease.code)
      : undefined;
    // One extra row tells whether a next page exists.
    const rows = await this.articles.listPublishedPage(crop.code, {
      diseaseCodes,
      after,
      limit: input.limit + 1,
    });
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeCursor({ title: last.title, id: last.id })
        : null;

    const diseases = await this.knowledge.findDiseasesByCodes(
      page.flatMap((article) => article.diseaseCode ?? []),
    );
    const diseaseByCode = new Map(diseases.map((d) => [d.code, d]));

    return {
      crop: {
        code: crop.code,
        slug: crop.slug,
        nameVi: crop.nameVi,
        diagnosisEnabled: crop.enabled,
      },
      articles: page.map((article) => {
        const disease = article.diseaseCode
          ? diseaseByCode.get(article.diseaseCode)
          : undefined;
        const cover = article.coverImage();
        const variant =
          disease && article.variantCode
            ? disease.variant(article.variantCode)
            : null;
        return {
          path: article.path(crop.slug),
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          coverUrl: cover ? this.storage.publicUrl(cover.key) : null,
          status: article.status,
          origin: article.origin,
          updatedAt: article.updatedAt,
          disease: disease
            ? {
                code: disease.code,
                nameVi: disease.nameVi,
                scientificName: disease.scientificName,
                category: disease.category,
              }
            : null,
          variant: variant && { code: variant.code, name: variant.names.vn },
        };
      }),
      nextCursor,
    };
  }
}
