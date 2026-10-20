import { DomainException, EDomainErrorType } from '@shared/domain';

/** The caller is not an ACTIVE admin. */
export class DiagnosisAdminRequiredException extends DomainException {
  constructor(userId: string) {
    super(
      'DIAGNOSIS_ADMIN_REQUIRED',
      'Only an admin can manage diagnosis settings',
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
