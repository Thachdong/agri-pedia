import {
  EAgentType,
  EArticleStatus,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
} from '../../../domain';

export class ArticleCropItemResponse {
  code: string;
  /** Value for `crop` of GET /knowledge/articles. */
  slug: string;
  nameVi: string;
  /** Crop supported by POST /diagnoses. */
  diagnosisEnabled: boolean;
  articleCount: number;
}

export class ListArticleCropsResponse {
  crops: ArticleCropItemResponse[];
}

export class ArticleCropResponse {
  code: string;
  slug: string;
  nameVi: string;
  diagnosisEnabled: boolean;
}

export class ArticleDiseaseSummaryResponse {
  code: string;
  nameVi: string;
  scientificName: string | null;
  category: EDiseaseCategory;
}

export class ArticleVariantSummaryResponse {
  /** Variant code, e.g. `RICE_BLAST__V1`. */
  code: string;
  name: string;
}

export class ArticleListItemResponse {
  /** Site path, e.g. `/benh-cay-trong/lua/benh-dao-on`. */
  path: string;
  slug: string;
  title: string;
  summary: string;
  /** Public URL of the cover image; null without a cover. */
  coverUrl: string | null;
  /** DRAFT pages should be noindex. */
  status: EArticleStatus;
  updatedAt: Date;
  disease: ArticleDiseaseSummaryResponse | null;
  /** Set for an article about one variant of `disease`. */
  variant: ArticleVariantSummaryResponse | null;
}

export class ListArticlesResponse {
  crop: ArticleCropResponse;
  articles: ArticleListItemResponse[];
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
}

export class ArticleDiseaseResponse {
  code: string;
  nameVi: string;
  nameEn: string;
  scientificName: string | null;
  aliases: string[];
  category: EDiseaseCategory;
  agentType: EAgentType;
  affectedParts: EPlantPart[];
  verification: EVerification;
}

export class ArticleVariantResponse {
  code: string;
  name: string;
  affectedParts: string;
}

export class ArticleLinkResponse {
  path: string;
  title: string;
}

export class VariantArticleResponse {
  path: string;
  title: string;
  variantCode: string;
  variantName: string;
}

export class ArticleCoverResponse {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export class ArticleImageCreditResponse {
  source: string;
  author: string;
  license: string;
  url: string;
}

export class ArticleImageResponse {
  url: string;
  alt: string;
  caption: string | null;
  width: number;
  height: number;
  credit: ArticleImageCreditResponse;
}

export class RelatedDiseaseResponse {
  code: string;
  nameVi: string;
  category: EDiseaseCategory;
  /** Article path; null when the disease has no article. */
  path: string | null;
  coverUrl: string | null;
}

export class ArticleSourceResponse {
  title: string;
  url: string;
}

export class ArticleDetailResponse {
  id: string;
  path: string;
  slug: string;
  title: string;
  summary: string;
  /**
   * Image URLs and `/diseases/<CODE>` links resolved; directives kept: `:::warning`, `:::tip`,
   * `::disease-card{code="..."}`, `::cta-diagnosis`.
   */
  markdown: string;
  crop: ArticleCropResponse;
  disease: ArticleDiseaseResponse | null;
  /** Set for an article about one variant of `disease`. */
  variant: ArticleVariantResponse | null;
  /** Variant article: the disease's main article (breadcrumb); null otherwise. */
  parentArticle: ArticleLinkResponse | null;
  /** Main article: the disease's variant articles, in KB variant order. */
  variantArticles: VariantArticleResponse[];
  cover: ArticleCoverResponse | null;
  /** In order of appearance in the body (credits list). */
  images: ArticleImageResponse[];
  /** `::disease-card` codes, then the KB's similar diseases. */
  relatedDiseases: RelatedDiseaseResponse[];
  sources: ArticleSourceResponse[];
  status: EArticleStatus;
  /** Temporarily `AI`. */
  reviewedBy: string | null;
  reviewedAt: Date | null;
  publishedAt: Date;
  updatedAt: Date;
}

export class ArticleSitemapCropResponse {
  slug: string;
  /** Latest updatedAt of the crop's articles. */
  updatedAt: Date;
}

export class ArticleSitemapItemResponse {
  path: string;
  updatedAt: Date;
}

export class ArticleSitemapResponse {
  crops: ArticleSitemapCropResponse[];
  /** REVIEWED articles only. */
  articles: ArticleSitemapItemResponse[];
}
