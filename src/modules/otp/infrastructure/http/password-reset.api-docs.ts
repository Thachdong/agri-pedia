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
  },
});
