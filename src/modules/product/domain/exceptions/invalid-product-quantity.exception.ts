import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidProductQuantityException extends DomainException {
  constructor(quantity: number) {
    super(
      'PRODUCT_INVALID_QUANTITY',
      `Quantity must be an integer >= 0, got ${quantity}`,
      EDomainErrorType.VALIDATION,
      { quantity },
    );
  }
}
