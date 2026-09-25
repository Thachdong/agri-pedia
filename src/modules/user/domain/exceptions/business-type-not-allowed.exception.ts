import { DomainException, EDomainErrorType } from '@shared/domain';
import { EUserRole } from '../enums/user-role.enum';

export class BusinessTypeNotAllowedException extends DomainException {
  constructor(role: EUserRole) {
    super(
      'USER_BUSINESS_TYPE_NOT_ALLOWED',
      `Business type is not allowed for role ${role}`,
      EDomainErrorType.VALIDATION,
      { role },
    );
  }
}
