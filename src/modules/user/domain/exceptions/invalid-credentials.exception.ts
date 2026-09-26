import { DomainException, EDomainErrorType } from '@shared/domain';

/** Unknown identifier or wrong password: one error for both, so accounts cannot be enumerated. */
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super(
      'USER_INVALID_CREDENTIALS',
      'Invalid identifier or password',
      EDomainErrorType.UNAUTHORIZED,
    );
  }
}
