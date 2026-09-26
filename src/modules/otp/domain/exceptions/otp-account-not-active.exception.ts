import { DomainException, EDomainErrorType } from '@shared/domain';

/** The account exists but is not active (e.g. DISTRIBUTOR not activated yet). */
export class OtpAccountNotActiveException extends DomainException {
  constructor() {
    super(
      'OTP_ACCOUNT_NOT_ACTIVE',
      'The account is not active',
      EDomainErrorType.FORBIDDEN,
    );
  }
}
