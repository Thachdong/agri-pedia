import { ProductSuggestionUsage } from '../../domain';

export interface IProductSuggestionUsageRepository {
  /**
   * Usage of the distributor, locked until the transaction ends (SELECT ... FOR UPDATE);
   * a distributor that never asked starts at 0. Must run inside an IUnitOfWork transaction.
   */
  getForUpdate(userId: string): Promise<ProductSuggestionUsage>;
  save(usage: ProductSuggestionUsage): Promise<void>;
}

export const PRODUCT_SUGGESTION_USAGE_REPOSITORY = Symbol(
  'PRODUCT_SUGGESTION_USAGE_REPOSITORY',
);
