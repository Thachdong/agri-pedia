import {
  EArticleOrigin,
  EArticleStatus,
  EDiseaseCategory,
} from '../../../domain';

export class AdminArticleSummaryResponse {
  slug: string;
  title: string;
  /** Site path, e.g. `/benh-cay-trong/lua/benh-dao-on`. */
  path: string;
  /** AI = generated (seed-managed); ADMIN = written by an admin; AI_REVIEWED = generated, edited by an admin. */
  origin: EArticleOrigin;
  /** false = hidden from the public API. */
  isPublished: boolean;
  status: EArticleStatus;
  /** Admin user id who created / last edited it; null = never edited by an admin. */
  editedBy: string | null;
  updatedAt: Date;
}

export class AdminArticleTargetResponse {
  /** Code to create / edit the article with: variant code, else disease code. */
  code: string;
  diseaseCode: string;
  /** Set for a variant entry. */
  variantCode: string | null;
  nameVi: string;
  category: EDiseaseCategory;
  /** null = no article yet (POST /admin/knowledge/articles). */
  article: AdminArticleSummaryResponse | null;
}

export class AdminArticleCropResponse {
  code: string;
  slug: string;
  nameVi: string;
}

export class ListAdminArticleTargetsResponse {
  crop: AdminArticleCropResponse;
  /** Diseases by Vietnamese name, each followed by its variants. */
  targets: AdminArticleTargetResponse[];
}

export class AdminArticleImageCreditResponse {
  source: string;
  author: string;
  license: string;
  url: string;
}

export class AdminArticleImageResponse {
  /** Name used in the markdown and `cover`; send it back without `tmpKey` to keep the image. */
  file: string;
  /** Public URL. */
  url: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: AdminArticleImageCreditResponse;
}

export class AdminArticleSourceResponse {
  title: string;
  url: string;
}

export class AdminArticleCropRefResponse {
  code: string;
  slug: string;
}

export class AdminArticleDetailResponse {
  code: string;
  crop: AdminArticleCropRefResponse;
  diseaseCode: string | null;
  variantCode: string | null;
  slug: string;
  path: string;
  title: string;
  summary: string;
  /** As stored: image file names and `/diseases/<CODE>` links unresolved. */
  markdown: string;
  cover: string | null;
  images: AdminArticleImageResponse[];
  sources: AdminArticleSourceResponse[];
  status: EArticleStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  origin: EArticleOrigin;
  isPublished: boolean;
  editedBy: string | null;
  kbVersion: string;
  publishedAt: Date;
  updatedAt: Date;
}

export class CreateArticleResponse {
  code: string;
  slug: string;
  path: string;
}

export class UpdateArticleResponse {
  code: string;
  slug: string;
  path: string;
  origin: EArticleOrigin;
}

export class ArticleVisibilityResponse {
  code: string;
  isPublished: boolean;
}
