import { DomainException, EDomainErrorType } from '@shared/domain';

export class UserIdentifierAlreadyUsedException extends DomainException {
  constructor() {
    super(
      'USER_IDENTIFIER_ALREADY_USED',
      'Identifier is already registered',
      EDomainErrorType.CONFLICT,
    );
  }
}
