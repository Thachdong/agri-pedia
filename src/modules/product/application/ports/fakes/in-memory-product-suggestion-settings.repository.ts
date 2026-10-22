import {
  DEFAULT_PRODUCT_SUGGESTION_SETTINGS,
  ProductSuggestionSettings,
  TProductSuggestionSettingsProps,
} from '../../../domain';
import { IProductSuggestionSettingsRepository } from '../product-suggestion-settings.repository';

export class InMemoryProductSuggestionSettingsRepository implements IProductSuggestionSettingsRepository {
  /** Saved settings; null = never saved. */
  saved: TProductSuggestionSettingsProps | null = null;
  savedAiModel: string | null = null;

  async get(): Promise<ProductSuggestionSettings> {
    return ProductSuggestionSettings.restore(
      this.saved ?? DEFAULT_PRODUCT_SUGGESTION_SETTINGS,
      this.savedAiModel,
    );
  }

  async save(settings: ProductSuggestionSettings): Promise<void> {
    this.saved = {
      invalidImageLimit: settings.invalidImageLimit,
      notFoundLimit: settings.notFoundLimit,
    };
    this.savedAiModel = settings.aiModel;
  }
}
