import {
  ProductSuggestionSettings,
  TProductSuggestionSettingsProps,
} from '../../../domain';
import { IProductSuggestionSettingsRepository } from '../product-suggestion-settings.repository';

export class InMemoryProductSuggestionSettingsRepository implements IProductSuggestionSettingsRepository {
  /** Saved settings; null = never saved. */
  saved: TProductSuggestionSettingsProps | null = null;

  async get(): Promise<ProductSuggestionSettings> {
    return this.saved
      ? ProductSuggestionSettings.restore(this.saved)
      : ProductSuggestionSettings.defaults();
  }
}
