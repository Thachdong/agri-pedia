import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only the seller who listed a product may change it. */
export class ProductNotOwnerException extends DomainException {
  constructor(productId: string, userId: string) {
    super(
      'PRODUCT_NOT_OWNER',
      `User ${userId} does not own product ${productId}`,
      EDomainErrorType.FORBIDDEN,
      { productId, userId },
    );
  }
}
