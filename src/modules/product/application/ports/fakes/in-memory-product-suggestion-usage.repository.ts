import {
  ProductSuggestionUsage,
  TProductSuggestionUsageProps,
} from '../../../domain';
import { IProductSuggestionUsageRepository } from '../product-suggestion-usage.repository';

export class InMemoryProductSuggestionUsageRepository implements IProductSuggestionUsageRepository {
  readonly items = new Map<string, TProductSuggestionUsageProps>();

  async getForUpdate(userId: string): Promise<ProductSuggestionUsage> {
    const saved = this.items.get(userId);
    return saved
      ? ProductSuggestionUsage.restore(saved)
      : ProductSuggestionUsage.start(userId);
  }

  async save(usage: ProductSuggestionUsage): Promise<void> {
    this.items.set(usage.userId, {
      userId: usage.userId,
      used: usage.used,
      bonusUsed: usage.bonusUsed,
    });
  }
}
