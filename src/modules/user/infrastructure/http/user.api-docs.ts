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
    createMyAddress: {
      summary: 'Add an address for the caller',
      description:
        'Responds 201 with the new address id. ' +
        '`province` = a province `codename` from GET /provinces; ' +
        '`ward` = a ward `codename` of that province from GET /provinces/{provinceCode}/wards. ' +
        '`isPrimary` (default false): true makes it the primary address and the current primary becomes a normal one.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'USER_INVALID_COORDINATES' },
        { type: EDomainErrorType.VALIDATION, code: 'USER_LOCATION_INVALID' },
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' },
      ],
    },
    setMyPrimaryAddress: {
      summary: "Set one of the caller's addresses as primary",
      description:
        'The current primary becomes a normal address. Already primary: 200, nothing changes. ' +
        'An address of another user answers 404 like an unknown one.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_ADDRESS_NOT_FOUND' },
      ],
    },
    deleteMyAddress: {
      summary: "Delete one of the caller's addresses",
      description:
        'Hard delete. The primary address cannot be deleted: set another address as primary first ' +
        '(PATCH /users/me/addresses/{addressId}/primary), so a user always keeps one. ' +
        'An address of another user answers 404 like an unknown one.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_ADDRESS_NOT_FOUND' },
        {
          type: EDomainErrorType.CONFLICT,
          code: 'USER_ADDRESS_PRIMARY_NOT_DELETABLE',
        },
      ],
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
