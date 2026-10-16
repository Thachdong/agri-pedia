import { Article } from '../../domain';

/** Identifies an article page. */
export type TArticleRef = { cropType: string; slug: string };

export interface IArticleRepository {
  /** Every article (seed compares them with the pack). */
  findAllForSeed(): Promise<Article[]>;
  /** Inserts / updates `save` by id and deletes `deleteIds`. Must run inside a transaction. */
  replaceArticles(save: Article[], deleteIds: string[]): Promise<void>;
  /** Articles whose body links to (`/diseases/<CODE>`) or shows a card of (`::disease-card`) any of these codes. */
  findReferencing(diseaseCodes: string[]): Promise<TArticleRef[]>;
}

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');
