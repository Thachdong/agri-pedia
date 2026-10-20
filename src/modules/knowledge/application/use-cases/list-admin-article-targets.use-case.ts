import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  Article,
  EArticleOrigin,
  EArticleStatus,
  EDiseaseCategory,
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

export type TListAdminArticleTargetsInput = {
  userId: string;
  /** Crop.slug. */
  cropSlug: string;
};

export type TAdminArticleSummary = {
  slug: string;
  title: string;
  path: string;
  origin: EArticleOrigin;
  isPublished: boolean;
  status: EArticleStatus;
  /** Admin user id who created / last edited it; null = never edited by an admin. */
  editedBy: string | null;
  updatedAt: Date;
};

/** A KB entry an article can be about: a disease (main article) or one of its variants. */
export type TAdminArticleTarget = {
  /** Variant code, else disease code: the code to create / edit the article with. */
  code: string;
  diseaseCode: string;
  variantCode: string | null;
  nameVi: string;
  category: EDiseaseCategory;
  /** null = no article yet. */
  article: TAdminArticleSummary | null;
};

export type TListAdminArticleTargetsOutput = {
  crop: { code: string; slug: string; nameVi: string };
  targets: TAdminArticleTarget[];
};

/**
 * Admin overview of a crop: every disease (by Vietnamese name), each followed by its variants
 * (KB order), with its article in any visibility, or null when none is written yet.
 */
@Injectable()
export class ListAdminArticleTargetsUseCase {
  constructor(
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
  ) {}

  async execute(
    input: TListAdminArticleTargetsInput,
  ): Promise<TListAdminArticleTargetsOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const crop = await this.knowledge.findCropBySlug(input.cropSlug);
    if (!crop) throw new KnowledgeCropNotFoundException(input.cropSlug);

    const [diseases, articles] = await Promise.all([
      this.knowledge.listDiseasesByCrop(crop.code),
      this.articles.listByCrop(crop.code),
    ]);
    const byCode = new Map(articles.map((a) => [a.kbCode, a]));
    const summary = (code: string): TAdminArticleSummary | null => {
      const article = byCode.get(code);
      return article ? toAdminArticleSummary(article, crop.slug) : null;
    };

    const targets = diseases
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'))
      .flatMap((disease): TAdminArticleTarget[] => [
        {
          code: disease.code,
          diseaseCode: disease.code,
          variantCode: null,
          nameVi: disease.nameVi,
          category: disease.category,
          article: summary(disease.code),
        },
        ...disease.content.variants.map((variant) => ({
          code: variant.code,
          diseaseCode: disease.code,
          variantCode: variant.code,
          nameVi: variant.names.vn,
          category: disease.category,
          article: summary(variant.code),
        })),
      ]);
    return {
      crop: { code: crop.code, slug: crop.slug, nameVi: crop.nameVi },
      targets,
    };
  }
}

export function toAdminArticleSummary(
  article: Article,
  cropSlug: string,
): TAdminArticleSummary {
  return {
    slug: article.slug,
    title: article.title,
    path: article.path(cropSlug),
    origin: article.origin,
    isPublished: article.isPublished,
    status: article.status,
    editedBy: article.editedBy,
    updatedAt: article.updatedAt,
  };
}
