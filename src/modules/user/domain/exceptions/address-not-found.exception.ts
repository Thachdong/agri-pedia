import { DomainException, EDomainErrorType } from '@shared/domain';

/** Unknown id, or the address belongs to another user: one error so callers cannot tell which. */
export class AddressNotFoundException extends DomainException {
  constructor(addressId: string) {
    super(
      'USER_ADDRESS_NOT_FOUND',
      `Address ${addressId} not found`,
      EDomainErrorType.NOT_FOUND,
      {
        addressId,
      },
    );
  }
}
