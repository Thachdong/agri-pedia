import { Inject, Injectable } from '@nestjs/common';
import {
  ARTICLE_CACHE_INVALIDATOR,
  IArticleCacheInvalidator,
} from '../ports/article-cache-invalidator';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';
import { TSeedArticlesOutput } from './seed-articles.use-case';

export type TRevalidateArticlesInput = TSeedArticlesOutput;

export type TRevalidateArticlesOutput = {
  /** Sent tags, sorted; empty = nothing changed, client not called. */
  tags: string[];
};

/** Cache tags the client uses (exact strings). */
export const ARTICLE_CACHE_TAGS = {
  /** Crop list and sitemap. */
  all: 'articles',
  crop: (cropSlug: string) => `articles:${cropSlug}`,
  article: (cropSlug: string, slug: string) => `article:${cropSlug}:${slug}`,
  /** Redirect `/diseases/<CODE>` → article. */
  disease: (code: string) => `article-disease:${code}`,
};

/**
 * Tells the client which article pages a seed changed: each changed / deleted article (old slug too),
 * its crop list, the global list, its disease redirect, and — when its link data changed
 * (new, renamed, title / cover, deleted) — every article linking to it.
 */
@Injectable()
export class RevalidateArticlesUseCase {
  constructor(
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(ARTICLE_CACHE_INVALIDATOR)
    private readonly invalidator: IArticleCacheInvalidator,
  ) {}

  async execute(
    input: TRevalidateArticlesInput,
  ): Promise<TRevalidateArticlesOutput> {
    const changed = [
      ...input.upserted,
      ...input.deleted.map((article) => ({
        ...article,
        oldSlug: null,
        linkChanged: true,
      })),
    ];
    if (changed.length === 0) return { tags: [] };

    const tags = new Set<string>([ARTICLE_CACHE_TAGS.all]);
    for (const article of changed) {
      tags.add(ARTICLE_CACHE_TAGS.crop(article.cropSlug));
      tags.add(ARTICLE_CACHE_TAGS.article(article.cropSlug, article.slug));
      if (article.oldSlug) {
        tags.add(ARTICLE_CACHE_TAGS.article(article.cropSlug, article.oldSlug));
      }
      if (article.diseaseCode) {
        tags.add(ARTICLE_CACHE_TAGS.disease(article.diseaseCode));
      }
    }

    const linkCodes = changed
      .filter((article) => article.linkChanged && article.diseaseCode)
      .map((article) => article.diseaseCode as string);
    if (linkCodes.length > 0) {
      const crops = await this.knowledge.listCrops();
      const slugOf = new Map(crops.map((crop) => [crop.code, crop.slug]));
      for (const ref of await this.articles.findReferencing(linkCodes)) {
        const cropSlug = slugOf.get(ref.cropType);
        if (cropSlug) tags.add(ARTICLE_CACHE_TAGS.article(cropSlug, ref.slug));
      }
    }

    const sorted = [...tags].sort();
    await this.invalidator.invalidate(sorted);
    return { tags: sorted };
  }
}
