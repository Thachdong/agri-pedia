import { DomainException, EDomainErrorType } from '@shared/domain';

/** Unknown, expired, rotated or revoked refresh token: one error, no detail leaked. */
export class InvalidRefreshTokenException extends DomainException {
  constructor() {
    super(
      'USER_INVALID_REFRESH_TOKEN',
      'Invalid refresh token',
      EDomainErrorType.UNAUTHORIZED,
    );
  }
}
