import { DomainException, EDomainErrorType } from '@shared/domain';

export class OtpNotFoundException extends DomainException {
  constructor() {
    super(
      'OTP_NOT_FOUND',
      'No code was issued for this identifier',
      EDomainErrorType.NOT_FOUND,
    );
  }
}
