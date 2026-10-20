import { ProductSuggestionMiss } from '../../../domain';
import { IProductSuggestionMissRepository } from '../product-suggestion-miss.repository';

export class InMemoryProductSuggestionMissRepository implements IProductSuggestionMissRepository {
  readonly items: ProductSuggestionMiss[] = [];

  async save(miss: ProductSuggestionMiss): Promise<void> {
    this.items.push(miss);
  }
}
