import { DomainException, EDomainErrorType } from '@shared/domain';

/** Only an ACTIVE DISTRIBUTOR may sell products. */
export class ProductSellerNotAllowedException extends DomainException {
  constructor(userId: string) {
    super(
      'PRODUCT_SELLER_NOT_ALLOWED',
      `User ${userId} is not an active distributor`,
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
