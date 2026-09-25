import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { ActivationController } from './activation.controller';

defineApiDocs(ActivationController, {
  tag: 'Auth',
  operations: {
    activate: {
      summary:
        'Activate a DISTRIBUTOR account with the code sent at registration',
      description:
        'Checks the latest activation code of the identifier (email or phone, any format). ' +
        'A wrong code is counted; too many wrong codes block the code for a while (OTP_BLOCKED). ' +
        'Responds 200 with an empty body; the account becomes ACTIVE.',
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
