import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { PasswordResetController } from './password-reset.controller';

defineApiDocs(PasswordResetController, {
  tag: 'Auth',
  operations: {
    requestReset: {
      summary: 'Send a password reset code',
      description:
        'Sends a RESET_PASSWORD code by email or SMS (per loginType) to an ACTIVE account. Responds 200 with an empty body. ' +
        'While the previous reset code is still valid: 409 OTP_ALREADY_REQUESTED, details { purpose, issuedAt, expiredAt }. ' +
        'While it is blocked (too many wrong codes), even if expired: 422 OTP_BLOCKED, details { blockUntil }. ' +
        'Once the previous code is expired or used, a new code is sent.',
      validation: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'OTP_ACCOUNT_NOT_FOUND' },
        { type: EDomainErrorType.FORBIDDEN, code: 'OTP_ACCOUNT_NOT_ACTIVE' },
        { type: EDomainErrorType.CONFLICT, code: 'OTP_ALREADY_REQUESTED' },
        { type: EDomainErrorType.BUSINESS_RULE, code: 'OTP_BLOCKED' },
      ],
    },
    confirmReset: {
      summary: 'Set a new password with the reset code',
      description:
        'Checks the latest RESET_PASSWORD code of the identifier (email or phone, any format) and consumes it. ' +
        'A wrong code is counted; too many wrong codes block the code for a while (OTP_BLOCKED, details { blockUntil }). ' +
        'Responds 200 with an empty body: the password is replaced and every session of the user is logged out (refresh tokens revoked).',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'OTP_INVALID_CODE' },
        { type: EDomainErrorType.NOT_FOUND, code: 'OTP_NOT_FOUND' },
        { type: EDomainErrorType.BUSINESS_RULE, code: 'OTP_ALREADY_CONSUMED' },
        { type: EDomainErrorType.BUSINESS_RULE, code: 'OTP_EXPIRED' },
        { type: EDomainErrorType.BUSINESS_RULE, code: 'OTP_BLOCKED' },
      ],
    },
  },
});
