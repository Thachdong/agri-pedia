import { DomainException, EDomainErrorType } from '@shared/domain';

export class UserNotFoundException extends DomainException {
  constructor(userId: string) {
    super(
      'USER_NOT_FOUND',
      `User ${userId} not found`,
      EDomainErrorType.NOT_FOUND,
      {
        userId,
      },
    );
  }
}
