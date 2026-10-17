import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import {
  Article,
  diseaseCardCodes,
  diseaseCodeOf,
  EAgentType,
  EArticleStatus,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
  KnowledgeArticleNotFoundException,
  KnowledgeCropNotFoundException,
  referencedDiseaseCodes,
  resolveArticleMarkdown,
  TArticleImageCredit,
  TArticleSource,
} from '../../domain';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';
import { TArticleCrop } from './list-articles.use-case';

export type TGetArticleInput = { cropSlug: string; slug: string };

export type TGetArticleOutput = {
  id: string;
  path: string;
  slug: string;
  title: string;
  summary: string;
  /** Image URLs and disease links resolved; directives (`:::warning`, `::disease-card`, ...) kept. */
  markdown: string;
  crop: TArticleCrop;
  disease: {
    code: string;
    nameVi: string;
    nameEn: string;
    scientificName: string | null;
    aliases: string[];
    category: EDiseaseCategory;
    agentType: EAgentType;
    affectedParts: EPlantPart[];
    verification: EVerification;
  } | null;
  /** Set for an article about one variant of `disease`. */
  variant: { code: string; name: string; affectedParts: string } | null;
  /** Variant article: the disease's main article (breadcrumb); null when it has none. */
  parentArticle: { path: string; title: string } | null;
  /** Main article: the variant articles of the disease, in KB variant order. */
  variantArticles: Array<{
    path: string;
    title: string;
    variantCode: string;
    variantName: string;
    /** Public URL of the variant article's cover; null without a cover. */
    coverUrl: string | null;
  }>;
  cover: { url: string; alt: string; width: number; height: number } | null;
  /** In order of appearance in the body, then images it does not show. */
  images: Array<{
    url: string;
    alt: string;
    caption: string | null;
    width: number;
    height: number;
    credit: TArticleImageCredit;
  }>;
  /** Codes of `::disease-card` directives, then the KB's similar diseases; path null without an article. */
  relatedDiseases: Array<{
    code: string;
    nameVi: string;
    category: EDiseaseCategory;
    path: string | null;
    coverUrl: string | null;
  }>;
  sources: TArticleSource[];
  status: EArticleStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedAt: Date;
  updatedAt: Date;
};

/** One article, ready to render (public). */
@Injectable()
export class GetArticleUseCase {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async execute(input: TGetArticleInput): Promise<TGetArticleOutput> {
    const crop = await this.knowledge.findCropBySlug(input.cropSlug);
    if (!crop) throw new KnowledgeCropNotFoundException(input.cropSlug);
    const article = await this.articles.findPublishedBySlug(
      crop.code,
      input.slug,
    );
    if (!article) {
      throw new KnowledgeArticleNotFoundException(input.cropSlug, input.slug);
    }

    const disease = article.diseaseCode
      ? await this.knowledge.findDisease(article.diseaseCode)
      : null;
    const relatedCodes = [
      ...new Set([
        ...diseaseCardCodes(article.markdown),
        ...(disease?.content.similarDiseases.map((s) => s.code) ?? []),
      ]),
    ].filter((code) => code !== article.diseaseCode);
    const linkedCodes = [
      ...new Set([
        ...relatedCodes,
        ...referencedDiseaseCodes(article.markdown),
      ]),
    ];
    const [linkedArticles, relatedDiseases] = await Promise.all([
      this.articles.findPublishedByDiseaseCodes([
        ...new Set([
          ...linkedCodes.map(diseaseCodeOf),
          ...(article.diseaseCode ? [article.diseaseCode] : []),
        ]),
      ]),
      this.knowledge.findDiseasesByCodes(relatedCodes),
    ]);
    // Article links stay inside the crop (seed checks the codes belong to it).
    const articleOf = new Map(
      linkedArticles
        .filter((a) => a.cropType === crop.code)
        .map((a) => [a.kbCode, a]),
    );
    // A variant without its own article links to the disease's main article.
    const articleFor = (code: string): Article | undefined =>
      articleOf.get(code) ?? articleOf.get(diseaseCodeOf(code));
    const variant =
      disease && article.variantCode
        ? disease.variant(article.variantCode)
        : null;
    const parent =
      article.variantCode && article.diseaseCode
        ? articleOf.get(article.diseaseCode)
        : undefined;
    const coverUrl = (a: Article): string | null => {
      const cover = a.coverImage();
      return cover ? this.storage.publicUrl(cover.key) : null;
    };
    const imageUrl = new Map(
      article.images.map((i) => [i.file, this.storage.publicUrl(i.key)]),
    );
    const diseaseOf = new Map(relatedDiseases.map((d) => [d.code, d]));
    const cover = article.coverImage();

    return {
      id: article.id,
      path: article.path(crop.slug),
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      markdown: resolveArticleMarkdown(article.markdown, {
        imageUrl: (file) => imageUrl.get(file),
        diseasePath: (code) => articleFor(code)?.path(crop.slug),
      }),
      crop: {
        code: crop.code,
        slug: crop.slug,
        nameVi: crop.nameVi,
        diagnosisEnabled: crop.enabled,
      },
      disease: disease && {
        code: disease.code,
        nameVi: disease.nameVi,
        nameEn: disease.nameEn,
        scientificName: disease.scientificName,
        aliases: [...disease.aliasesVi, ...disease.aliasesEn],
        category: disease.category,
        agentType: disease.agentType,
        affectedParts: disease.affectedParts,
        verification: disease.verification,
      },
      variant: variant && {
        code: variant.code,
        name: variant.names.vn,
        affectedParts: variant.affectedPart.vn,
      },
      parentArticle: parent
        ? { path: parent.path(crop.slug), title: parent.title }
        : null,
      variantArticles:
        disease && !article.variantCode
          ? disease.content.variants.flatMap((v) => {
              const own = articleOf.get(v.code);
              return own
                ? [
                    {
                      path: own.path(crop.slug),
                      title: own.title,
                      variantCode: v.code,
                      variantName: v.names.vn,
                      coverUrl: coverUrl(own),
                    },
                  ]
                : [];
            })
          : [],
      cover: cover && {
        url: this.storage.publicUrl(cover.key),
        alt: cover.alt,
        width: cover.width,
        height: cover.height,
      },
      images: article.imagesInOrder().map((image) => ({
        url: this.storage.publicUrl(image.key),
        alt: image.alt,
        caption: image.caption,
        width: image.width,
        height: image.height,
        credit: image.credit,
      })),
      relatedDiseases: relatedCodes.flatMap((code) => {
        const related = diseaseOf.get(code);
        if (!related) return [];
        const relatedArticle = articleOf.get(related.code);
        return [
          {
            code: related.code,
            nameVi: related.nameVi,
            category: related.category,
            path: relatedArticle?.path(crop.slug) ?? null,
            coverUrl: relatedArticle ? coverUrl(relatedArticle) : null,
          },
        ];
      }),
      sources: article.sources,
      status: article.status,
      reviewedBy: article.reviewedBy,
      reviewedAt: article.reviewedAt,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
    };
  }
}
