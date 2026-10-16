import { DomainException, EDomainErrorType } from '@shared/domain';

/** Pagination cursor was not produced by this API (or was altered). */
export class InvalidDiagnosisCursorException extends DomainException {
  constructor() {
    super(
      'DIAGNOSIS_INVALID_CURSOR',
      'Invalid pagination cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
