import { EDomainErrorType } from '@shared/domain';
import { defineApiDocs } from '@shared/swagger';
import { AuthController } from './auth.controller';

defineApiDocs(AuthController, {
  tag: 'Auth',
  operations: {
    register: {
      summary: 'Register a new account',
      description:
        'Creates a user with its primary address. Responds 201 with an empty body. ' +
        '`address.province` = a province `codename` from GET /provinces; ' +
        '`address.ward` = a ward `codename` of that province from GET /provinces/{provinceCode}/wards. ' +
        'Unknown codenames, or a ward of another province, return USER_LOCATION_INVALID.',
      validation: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'USER_INVALID_COORDINATES' },
        { type: EDomainErrorType.VALIDATION, code: 'USER_LOCATION_INVALID' },
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
        'Responds 200 with an access token (JWT), a refresh token and the user profile ' +
        '(same shape as GET /users/me: `email` / `phone` login identifier, `bussinessLicense` signed URL). ' +
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
    refreshToken: {
      summary: 'Exchange a refresh token for a new token pair',
      description:
        'Responds 200 with a new access token and a new refresh token; the one sent stops working. ' +
        'A just-rotated token sent again within the grace period (retry) still succeeds. ' +
        'Reusing a rotated token after the grace period, or a revoked one, revokes every token of that login. ' +
        'Unknown, expired, reused or revoked tokens and inactive owners all return USER_INVALID_REFRESH_TOKEN.',
      validation: true,
      errors: [
        {
          type: EDomainErrorType.UNAUTHORIZED,
          code: 'USER_INVALID_REFRESH_TOKEN',
        },
      ],
    },
    logout: {
      summary: 'End the current session',
      description:
        'Revokes the session (every refresh token of that login) the given refresh token belongs to. ' +
        'Responds 200 with an empty body, also when the refresh token is unknown, expired, already revoked ' +
        "or another user's (then nothing changes). The access token stays valid until it expires; discard it.",
      validation: true,
      auth: true,
    },
    changePassword: {
      summary: 'Change the password of the caller',
      description:
        'Requires the current password. Responds 200 with an empty body. ' +
        'Every session of the user ends (all refresh tokens revoked); access tokens already issued stay valid until they expire. ' +
        'A wrong current password returns 400 USER_WRONG_PASSWORD and changes nothing.',
      validation: true,
      auth: true,
      errors: [
        { type: EDomainErrorType.VALIDATION, code: 'USER_WRONG_PASSWORD' },
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' },
      ],
    },
    realtimeTicket: {
      summary: 'Issue a realtime ticket for the caller',
      description:
        'For browsers behind a BFF that must not hold the access token: the BFF calls this with the access token ' +
        'and hands only the ticket to the browser, which opens the socket.io connection with `auth: { ticket }`. ' +
        'The ticket expires after `expiresIn` seconds (default 30) and only needs to be valid at the handshake; ' +
        'fetch a new one for every connect/reconnect. It is not accepted as an access token. ' +
        'An invalid or expired ticket fails the handshake with connect_error AUTH_INVALID_ACCESS_TOKEN.',
      auth: true,
      errors: [
        { type: EDomainErrorType.FORBIDDEN, code: 'USER_NOT_ACTIVE' },
        { type: EDomainErrorType.NOT_FOUND, code: 'USER_NOT_FOUND' },
      ],
    },
  },
});
