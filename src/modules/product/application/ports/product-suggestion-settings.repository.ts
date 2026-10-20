import { ProductSuggestionSettings } from '../../domain';

export interface IProductSuggestionSettingsRepository {
  /** Saved settings; defaults when none were saved. */
  get(): Promise<ProductSuggestionSettings>;
  save(settings: ProductSuggestionSettings): Promise<void>;
}

export const PRODUCT_SUGGESTION_SETTINGS_REPOSITORY = Symbol(
  'PRODUCT_SUGGESTION_SETTINGS_REPOSITORY',
);
