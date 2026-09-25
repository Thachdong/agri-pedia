import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AuthController } from './auth.controller';

defineApiDocs(AuthController, {
  tag: 'Auth',
  operations: {
    register: {
      summary: 'Register a new account',
      description:
        'Creates a user with its primary address. Responds 201 with an empty body.',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'USER_INVALID_COORDINATES' },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'USER_BUSINESS_TYPE_REQUIRED',
        },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'USER_BUSINESS_TYPE_NOT_ALLOWED',
        },
        {
          type: EDomainErrorType.CONFLICT,
          code: 'USER_IDENTIFIER_ALREADY_USED',
        },
      ],
    },
  },
});
