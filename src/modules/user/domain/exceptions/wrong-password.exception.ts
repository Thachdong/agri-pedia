import { DomainException, EDomainErrorType } from '@shared/domain';

/** Current password given by a logged-in user does not match. VALIDATION (400), not 401: the session itself is valid. */
export class WrongPasswordException extends DomainException {
  constructor() {
    super(
      'USER_WRONG_PASSWORD',
      'Current password is incorrect',
      EDomainErrorType.VALIDATION,
    );
  }
}
