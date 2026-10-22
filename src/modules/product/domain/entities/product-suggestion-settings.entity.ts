import { InvalidSuggestionSettingsException } from '../exceptions/invalid-suggestion-settings.exception';

export type TProductSuggestionSettingsProps = {
  /**
   * Suggestions a distributor sees as its quota (lifetime). Charged by UNREADABLE and FOUND,
   * and by NOT_FOUND once the not-found bonus is used up.
   */
  invalidImageLimit: number;
  /** Hidden bonus charged by NOT_FOUND first, so gaps in the catalog do not eat the visible quota. */
  notFoundLimit: number;
};

/** Allowed range of each setting. */
export const PRODUCT_SUGGESTION_SETTINGS_BOUNDS = {
  invalidImageLimit: { min: 1, max: 10000 },
  notFoundLimit: { min: 0, max: 10000 },
} as const;

export const DEFAULT_PRODUCT_SUGGESTION_SETTINGS: TProductSuggestionSettingsProps =
  {
    invalidImageLimit: 50,
    notFoundLimit: 50,
  };

function validate(
  props: TProductSuggestionSettingsProps,
): TProductSuggestionSettingsProps {
  for (const [field, { min, max }] of Object.entries(
    PRODUCT_SUGGESTION_SETTINGS_BOUNDS,
  )) {
    const value = props[field as keyof TProductSuggestionSettingsProps];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new InvalidSuggestionSettingsException(
        field,
        `must be an integer in ${min}..${max}, got ${value}`,
      );
    }
  }
  return { ...props };
}

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/** App-wide settings of product suggestions (one per app). */
export class ProductSuggestionSettings {
  private constructor(
    private props: TProductSuggestionSettingsProps,
    private aiModelId: string | null,
  ) {}

  /** Settings used until an admin saves some. */
  static defaults(): ProductSuggestionSettings {
    return new ProductSuggestionSettings(
      { ...DEFAULT_PRODUCT_SUGGESTION_SETTINGS },
      null,
    );
  }

  static restore(
    props: TProductSuggestionSettingsProps,
    aiModel: string | null = null,
  ): ProductSuggestionSettings {
    return new ProductSuggestionSettings({ ...props }, aiModel);
  }

  /** Replaces both quotas, keeps the AI model; throws InvalidSuggestionSettings when one is out of range. */
  update(props: TProductSuggestionSettingsProps): void {
    this.props = validate(props);
  }

  /** Replaces the AI model (null = env model); throws InvalidSuggestionSettings on a malformed model id. */
  updateAiModel(model: string | null): void {
    if (model !== null && !MODEL_ID.test(model)) {
      throw new InvalidSuggestionSettingsException(
        'model',
        `not a model id: ${model}`,
      );
    }
    this.aiModelId = model;
  }

  get invalidImageLimit(): number {
    return this.props.invalidImageLimit;
  }

  get notFoundLimit(): number {
    return this.props.notFoundLimit;
  }

  /** AI model picked by an admin; null = the model set in the env (`productSuggestion` config). */
  get aiModel(): string | null {
    return this.aiModelId;
  }
}
