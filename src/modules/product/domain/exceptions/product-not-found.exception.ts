import { DomainException, EDomainErrorType } from '@shared/domain';

export class ProductNotFoundException extends DomainException {
  constructor(productId: string) {
    super(
      'PRODUCT_NOT_FOUND',
      `Product ${productId} not found`,
      EDomainErrorType.NOT_FOUND,
      { productId },
    );
  }
}
