import { DomainException, EDomainErrorType } from '@shared/domain';

export class OtpAlreadyConsumedException extends DomainException {
  constructor() {
    super(
      'OTP_ALREADY_CONSUMED',
      'Code has already been used',
      EDomainErrorType.BUSINESS_RULE,
    );
  }
}
