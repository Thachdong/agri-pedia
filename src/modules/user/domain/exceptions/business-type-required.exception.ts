import { DomainException, EDomainErrorType } from '@shared/domain';
import { EUserRole } from '../enums/user-role.enum';

export class BusinessTypeRequiredException extends DomainException {
  constructor(role: EUserRole) {
    super(
      'USER_BUSINESS_TYPE_REQUIRED',
      `Business type is required for role ${role}`,
      EDomainErrorType.VALIDATION,
      { role },
    );
  }
}
