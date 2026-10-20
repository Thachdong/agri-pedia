import { SuggestionQuotaExceededException } from '../exceptions/suggestion-quota-exceeded.exception';
import { ProductSuggestionSettings } from './product-suggestion-settings.entity';

export type TProductSuggestionUsageProps = {
  userId: string;
  /** Suggestions charged to the visible quota (settings.invalidImageLimit). */
  used: number;
  /** NOT_FOUND suggestions charged to the hidden bonus (settings.notFoundLimit). */
  bonusUsed: number;
};

/**
 * Suggestions a distributor has used (lifetime, never reset).
 * Each request reserves one from the visible quota before the AI call, then
 * refund() on a provider error or settleNotFound() when the name is not in the catalog.
 */
export class ProductSuggestionUsage {
  private constructor(private props: TProductSuggestionUsageProps) {}

  /** Distributor that never asked for a suggestion. */
  static start(userId: string): ProductSuggestionUsage {
    return new ProductSuggestionUsage({ userId, used: 0, bonusUsed: 0 });
  }

  static restore(props: TProductSuggestionUsageProps): ProductSuggestionUsage {
    return new ProductSuggestionUsage({ ...props });
  }

  /** Takes one suggestion from the visible quota; throws SuggestionQuotaExceeded when none is left. */
  reserve(settings: ProductSuggestionSettings): void {
    if (this.props.used >= settings.invalidImageLimit) {
      throw new SuggestionQuotaExceededException(settings.invalidImageLimit);
    }
    this.props = { ...this.props, used: this.props.used + 1 };
  }

  /** Gives back a reserved suggestion (the AI request failed). */
  refund(): void {
    this.props = { ...this.props, used: Math.max(0, this.props.used - 1) };
  }

  /** NOT_FOUND: moves the reserved suggestion to the bonus while the bonus has room; else it stays charged. */
  settleNotFound(settings: ProductSuggestionSettings): void {
    if (
      this.props.used === 0 ||
      this.props.bonusUsed >= settings.notFoundLimit
    ) {
      return;
    }
    this.props = {
      ...this.props,
      used: this.props.used - 1,
      bonusUsed: this.props.bonusUsed + 1,
    };
  }

  /** Suggestions left in the visible quota (0 when the limit was lowered below what is used). */
  remaining(settings: ProductSuggestionSettings): number {
    return Math.max(0, settings.invalidImageLimit - this.props.used);
  }

  get userId(): string {
    return this.props.userId;
  }

  get used(): number {
    return this.props.used;
  }

  get bonusUsed(): number {
    return this.props.bonusUsed;
  }
}
