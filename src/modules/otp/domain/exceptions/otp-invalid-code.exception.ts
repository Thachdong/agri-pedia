import { DomainException, EDomainErrorType } from '@shared/domain';

export class OtpInvalidCodeException extends DomainException {
  constructor() {
    super('OTP_INVALID_CODE', 'Code is incorrect', EDomainErrorType.VALIDATION);
  }
}
