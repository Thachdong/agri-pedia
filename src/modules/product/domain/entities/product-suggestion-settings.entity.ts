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

/** App-wide settings of product suggestions (one per app). */
export class ProductSuggestionSettings {
  private constructor(private props: TProductSuggestionSettingsProps) {}

  /** Settings used until an admin saves some. */
  static defaults(): ProductSuggestionSettings {
    return new ProductSuggestionSettings({
      ...DEFAULT_PRODUCT_SUGGESTION_SETTINGS,
    });
  }

  static restore(
    props: TProductSuggestionSettingsProps,
  ): ProductSuggestionSettings {
    return new ProductSuggestionSettings({ ...props });
  }

  /** Replaces every setting; throws InvalidSuggestionSettings when one is out of range. */
  update(props: TProductSuggestionSettingsProps): void {
    this.props = validate(props);
  }

  get invalidImageLimit(): number {
    return this.props.invalidImageLimit;
  }

  get notFoundLimit(): number {
    return this.props.notFoundLimit;
  }
}
