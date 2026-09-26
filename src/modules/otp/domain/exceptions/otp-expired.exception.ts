import { DomainException, EDomainErrorType } from '@shared/domain';

export class OtpExpiredException extends DomainException {
  constructor() {
    super('OTP_EXPIRED', 'Code has expired', EDomainErrorType.BUSINESS_RULE);
  }
}
