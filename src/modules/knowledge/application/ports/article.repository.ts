import { Article } from '../../domain';

/** Identifies an article page. */
export type TArticleRef = { cropType: string; slug: string };

/** Keyset of the article list order (title, then id). */
export type TArticlePageKey = { title: string; id: string };

export type TArticlePageQuery = {
  /** Only articles of these diseases (category filter); omitted = all. */
  diseaseCodes?: string[];
  /** Articles strictly after this key. */
  after?: TArticlePageKey;
  limit: number;
};

export interface IArticleRepository {
  /** Every article (seed compares them with the pack). */
  findAllForSeed(): Promise<Article[]>;
  /** Inserts / updates `save` by id and deletes `deleteIds`. Must run inside a transaction. */
  replaceArticles(save: Article[], deleteIds: string[]): Promise<void>;
  /** Articles whose body links to (`/diseases/<CODE>`) or shows a card of (`::disease-card`) any of these codes. */
  findReferencing(diseaseCodes: string[]): Promise<TArticleRef[]>;
  /** Number of articles per crop code; crops without articles left out. */
  countByCrop(): Promise<Map<string, number>>;
  /** Articles of the crop by title then id. */
  listPage(cropType: string, query: TArticlePageQuery): Promise<Article[]>;
  findBySlug(cropType: string, slug: string): Promise<Article | null>;
  /** Articles about these diseases; codes without an article left out. */
  findByDiseaseCodes(diseaseCodes: string[]): Promise<Article[]>;
  /** Every REVIEWED article. */
  listIndexable(): Promise<Article[]>;
}

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');
