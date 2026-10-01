import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { UserController } from './user.controller';

defineApiDocs(UserController, {
  tag: 'User',
  operations: {
    getMe: {
      summary: 'Get the profile of the caller',
      description:
        'Profile as returned by POST /auth/login (user), including the primary address (null if none). ' +
        'Works for any user with a valid access token, whatever its status.',
      auth: true,
      errors: [{ type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' }],
    },
    getMyAddresses: {
      summary: 'List the addresses of the caller',
      description:
        'Every address of the caller, primary first. ' +
        'Works for any user with a valid access token, whatever its status.',
      auth: true,
      errors: [{ type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' }],
    },
    updateMe: {
      summary: 'Update the profile of the caller',
      description:
        'Every field is optional; an absent or null field is kept (clearing avatar / business license is not supported). ' +
        'bussinessType: DISTRIBUTOR only, cannot be set to null. ' +
        'avatar / bussinessLicense: a file already uploaded to TMP (key from POST /media/presign-url). ' +
        'The response returns its new media id at once; the file is moved and the previous one deleted in the background. ' +
        'An invalid or missing TMP file is skipped (logged) and the previous file is kept, but the returned media id is still stored.',
      validation: true,
      auth: true,
      errors: [
        {
          type: EDomainErrorType.VALIDATION,
          code: 'USER_BUSINESS_TYPE_NOT_ALLOWED',
        },
        {
          type: EDomainErrorType.VALIDATION,
          code: 'USER_BUSINESS_TYPE_REQUIRED',
        },
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' },
      ],
    },
  },
});
