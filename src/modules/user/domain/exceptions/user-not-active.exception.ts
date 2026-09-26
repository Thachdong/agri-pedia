import { DomainException, EDomainErrorType } from '@shared/domain';
import { EUserStatus } from '../enums/user-status.enum';

export class UserNotActiveException extends DomainException {
  constructor(userId: string, status: EUserStatus) {
    super(
      'USER_NOT_ACTIVE',
      `User ${userId} is not active`,
      EDomainErrorType.FORBIDDEN,
      { status },
    );
  }
}
