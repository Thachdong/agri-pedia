import { DomainException, EDomainErrorType } from '@shared/domain';

export class OtpBlockedException extends DomainException {
  constructor(blockUntil: Date) {
    super(
      'OTP_BLOCKED',
      `Code is blocked until ${blockUntil.toISOString()}`,
      EDomainErrorType.BUSINESS_RULE,
      { blockUntil: blockUntil.toISOString() },
    );
  }
}
