import { DomainException, EDomainErrorType } from '@shared/domain';

/** The primary address cannot be deleted; set another address as primary first. */
export class PrimaryAddressNotDeletableException extends DomainException {
  constructor(addressId: string) {
    super(
      'USER_ADDRESS_PRIMARY_NOT_DELETABLE',
      `Address ${addressId} is the primary address and cannot be deleted`,
      EDomainErrorType.CONFLICT,
      {
        addressId,
      },
    );
  }
}
