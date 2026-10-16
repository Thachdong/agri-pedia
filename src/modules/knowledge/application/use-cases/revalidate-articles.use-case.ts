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
import { TSeedArticlesOutput, TSeededArticle } from './seed-articles.use-case';

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
 * its crop list, the global list, its disease / variant redirect, the related article of the same
 * disease (a variant article's main article lists the variants; a main article's title is the
 * variants' breadcrumb), and — when its link data changed (new, renamed, title / cover, deleted) —
 * every article linking to it (for a main article also links to its variant codes, which fall back to it).
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
      const code = article.variantCode ?? article.diseaseCode;
      if (code) tags.add(ARTICLE_CACHE_TAGS.disease(code));
    }

    for (const tag of await this.relatedArticleTags(changed)) tags.add(tag);

    const sorted = [...tags].sort();
    await this.invalidator.invalidate(sorted);
    return { tags: sorted };
  }

  /** Tags of the same-disease articles and of the articles linking to the changed ones. */
  private async relatedArticleTags(
    changed: TSeededArticle[],
  ): Promise<string[]> {
    const ofDiseases = changed.filter((article) => article.diseaseCode);
    if (ofDiseases.length === 0) return [];
    const crops = await this.knowledge.listCrops();
    const slugOf = new Map(crops.map((crop) => [crop.code, crop.slug]));
    const tags: string[] = [];
    const addArticle = (cropType: string, slug: string): void => {
      const cropSlug = slugOf.get(cropType);
      if (cropSlug) tags.push(ARTICLE_CACHE_TAGS.article(cropSlug, slug));
    };

    const sameDisease = await this.articles.findByDiseaseCodes([
      ...new Set(ofDiseases.map((article) => article.diseaseCode as string)),
    ]);
    for (const article of ofDiseases) {
      for (const other of sameDisease) {
        if (other.diseaseCode !== article.diseaseCode) continue;
        // variant changed -> its main article; main changed -> every variant article
        const related = article.variantCode
          ? other.variantCode === null
          : other.variantCode !== null;
        if (related) addArticle(other.cropType, other.slug);
      }
    }

    const linkChanged = ofDiseases.filter((article) => article.linkChanged);
    const mainDiseases = linkChanged
      .filter((article) => !article.variantCode)
      .map((article) => article.diseaseCode as string);
    // Links to a variant without its own article resolve to the main article.
    const variantCodes =
      mainDiseases.length > 0
        ? (await this.knowledge.findDiseasesByCodes(mainDiseases)).flatMap(
            (disease) => disease.content.variants.map((v) => v.code),
          )
        : [];
    const linkCodes = [
      ...linkChanged.map(
        (article) => (article.variantCode ?? article.diseaseCode) as string,
      ),
      ...variantCodes,
    ];
    if (linkCodes.length > 0) {
      for (const ref of await this.articles.findReferencing(linkCodes)) {
        addArticle(ref.cropType, ref.slug);
      }
    }
    return tags;
  }
}
