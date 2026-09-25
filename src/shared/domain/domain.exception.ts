import { EDomainErrorType } from './domain-error-type.enum';

/**
 * Base class for every business error. Subclass per error case:
 *
 *   export class EmailAlreadyUsedException extends DomainException {
 *     constructor(email: string) {
 *       super('USER_EMAIL_ALREADY_USED', `Email ${email} is already used`, EDomainErrorType.CONFLICT, { email });
 *     }
 *   }
 */
export abstract class DomainException extends Error {
  protected constructor(
    readonly code: string,
    message: string,
    readonly type: EDomainErrorType,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
