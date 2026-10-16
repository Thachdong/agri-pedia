import { Article } from '../../domain';

export interface IArticleRepository {
  /** Every article (seed compares them with the pack). */
  findAllForSeed(): Promise<Article[]>;
  /** Inserts / updates `save` by id and deletes `deleteIds`. Must run inside a transaction. */
  replaceArticles(save: Article[], deleteIds: string[]): Promise<void>;
}

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');
