import { ProductSuggestionMiss } from '../../domain';

export interface IProductSuggestionMissRepository {
  save(miss: ProductSuggestionMiss): Promise<void>;
}

export const PRODUCT_SUGGESTION_MISS_REPOSITORY = Symbol(
  'PRODUCT_SUGGESTION_MISS_REPOSITORY',
);
