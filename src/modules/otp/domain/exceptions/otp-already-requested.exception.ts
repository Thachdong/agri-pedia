import { DomainException, EDomainErrorType } from '@shared/domain';
import { EOtpPurpose } from '../enums/otp-purpose.enum';

/** A code for the same purpose was sent and is still valid: no new code before `expiredAt`. */
export class OtpAlreadyRequestedException extends DomainException {
  constructor(purpose: EOtpPurpose, issuedAt: Date, expiredAt: Date) {
    super(
      'OTP_ALREADY_REQUESTED',
      `A ${purpose} code was already sent and is valid until ${expiredAt.toISOString()}`,
      EDomainErrorType.CONFLICT,
      {
        purpose,
        issuedAt: issuedAt.toISOString(),
        expiredAt: expiredAt.toISOString(),
      },
    );
  }
}
