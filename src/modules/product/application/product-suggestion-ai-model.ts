import { IConfigService } from '@shared/config';
import { ProductSuggestionSettings } from '../domain';

/** Model the env (`productSuggestion` config) sets; used when an admin picked none. */
export const envProductNameModel = (config: IConfigService): string =>
  config.get('productSuggestion').model;

/** Admin-picked model, else the env model. */
export const resolveProductNameModel = (
  settings: ProductSuggestionSettings,
  config: IConfigService,
): string => settings.aiModel ?? envProductNameModel(config);

/** Admin view: picked model (null = none picked) and the env model used in its place. */
export type TProductSuggestionAiModelOutput = {
  model: string | null;
  defaults: { model: string };
};

export const toAiModelOutput = (
  settings: ProductSuggestionSettings,
  config: IConfigService,
): TProductSuggestionAiModelOutput => ({
  model: settings.aiModel,
  defaults: { model: envProductNameModel(config) },
});
