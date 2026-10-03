import { DomainException, EDomainErrorType } from '@shared/domain';

/** The id is not a user, or the user is not a DISTRIBUTOR. */
export class ProductDistributorNotFoundException extends DomainException {
  constructor(distributorId: string) {
    super(
      'PRODUCT_DISTRIBUTOR_NOT_FOUND',
      `Distributor ${distributorId} not found`,
      EDomainErrorType.NOT_FOUND,
      { distributorId },
    );
  }
}
