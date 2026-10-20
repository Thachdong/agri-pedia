import { ProductSuggestionMiss } from '../../domain';

/** Misses grouped by normalized name. */
export type TProductSuggestionMissSummary = {
  normalizedName: string;
  /** Name as read in the latest miss of the group. */
  latestDetectedName: string;
  count: number;
  /** Distinct distributors that sent the name. */
  distributorCount: number;
  lastSeenAt: Date;
};

export type TProductSuggestionMissSummaryPage = {
  /** Most misses first, then most recent. */
  items: TProductSuggestionMissSummary[];
  /** Groups over all pages. */
  total: number;
};

export interface IProductSuggestionMissRepository {
  save(miss: ProductSuggestionMiss): Promise<void>;
  listSummaries(query: {
    offset: number;
    limit: number;
  }): Promise<TProductSuggestionMissSummaryPage>;
}

export const PRODUCT_SUGGESTION_MISS_REPOSITORY = Symbol(
  'PRODUCT_SUGGESTION_MISS_REPOSITORY',
);
