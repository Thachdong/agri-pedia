import { DomainException, EDomainErrorType } from '@shared/domain';

/** No account registered with this identifier and login type. */
export class OtpAccountNotFoundException extends DomainException {
  constructor() {
    super(
      'OTP_ACCOUNT_NOT_FOUND',
      'No account found for this identifier',
      EDomainErrorType.NOT_FOUND,
    );
  }
}
