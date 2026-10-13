import { DomainException, EDomainErrorType } from '@shared/domain';

/** User reached the number of diagnoses allowed per day. */
export class DiagnosisDailyLimitExceededException extends DomainException {
  constructor(limit: number) {
    super(
      'DIAGNOSIS_DAILY_LIMIT_EXCEEDED',
      `Daily diagnosis limit of ${limit} reached`,
      EDomainErrorType.BUSINESS_RULE,
      { limit },
    );
  }
}
