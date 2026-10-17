import { DomainException, EDomainErrorType } from '@shared/domain';
import { EUserRole } from '../enums/user-role.enum';

export class UserRoleNotAllowedException extends DomainException {
  constructor(role: EUserRole) {
    super(
      'USER_ROLE_NOT_ALLOWED',
      `Role ${role} cannot be registered`,
      EDomainErrorType.VALIDATION,
      { role },
    );
  }
}
