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
    login: {
      summary: 'Log in with identifier and password',
      description:
        'Responds 200 with an access token (JWT), a refresh token and the user profile. ' +
        'Unknown identifier, login type mismatch and wrong password all return USER_INVALID_CREDENTIALS. ' +
        'USER_NOT_ACTIVE (distributor not activated yet) is returned only after the password matched.',
      validation: true,
      errors: [
        {
          type: EDomainErrorType.UNAUTHORIZED,
          code: 'USER_INVALID_CREDENTIALS',
        },
        { type: EDomainErrorType.FORBIDDEN, code: 'USER_NOT_ACTIVE' },
      ],
    },
  },
});
