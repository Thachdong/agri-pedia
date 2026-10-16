import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only ACTIVE users may request a diagnosis. */
export class DiagnosisUserNotAllowedException extends DomainException {
  constructor(userId: string) {
    super(
      'DIAGNOSIS_USER_NOT_ALLOWED',
      'User is not allowed to request a diagnosis',
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
