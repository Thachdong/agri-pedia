import { DomainException, EDomainErrorType } from '@shared/domain';

/** Distributor used every product suggestion it is allowed (lifetime, no reset). */
export class SuggestionQuotaExceededException extends DomainException {
  constructor(limit: number) {
    super(
      'PRODUCT_SUGGESTION_QUOTA_EXCEEDED',
      `Product suggestion limit of ${limit} reached`,
      EDomainErrorType.BUSINESS_RULE,
      { limit },
    );
  }
}
