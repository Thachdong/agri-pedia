import { DomainException, EDomainErrorType } from '@shared/domain';

export class InvalidProductPriceException extends DomainException {
  constructor(price: number) {
    super(
      'PRODUCT_INVALID_PRICE',
      `Price must be a number >= 0, got ${price}`,
      EDomainErrorType.VALIDATION,
      { price },
    );
  }
}
