export class ProductSuggestionSettingsResponse {
  invalidImageLimit: number;
  notFoundLimit: number;
}

export class ProductSuggestionMissResponse {
  normalizedName: string;
  /** Name as read in the latest miss of the group. */
  latestDetectedName: string;
  count: number;
  /** Distinct distributors that sent the name. */
  distributorCount: number;
  lastSeenAt: Date;
}

export class ListProductSuggestionMissesResponse {
  /** Most misses first, then most recent. */
  items: ProductSuggestionMissResponse[];
  /** Names over all pages. */
  total: number;
  page: number;
  limit: number;
}

export class ProductSuggestionDefaultAiModelResponse {
  model: string;
}

export class ProductSuggestionAiModelResponse {
  /** Admin-picked model; null = `defaults.model` is used. */
  model: string | null;
  /** Model set in the env. */
  defaults: ProductSuggestionDefaultAiModelResponse;
}
