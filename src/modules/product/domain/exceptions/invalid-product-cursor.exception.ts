import { DomainException, EDomainErrorType } from '@shared/domain';

/** Pagination cursor was not produced by this API (or was altered). */
export class InvalidProductCursorException extends DomainException {
  constructor() {
    super(
      'PRODUCT_INVALID_CURSOR',
      'Invalid pagination cursor',
      EDomainErrorType.VALIDATION,
    );
  }
}
