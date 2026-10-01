import { DomainException, EDomainErrorType } from '@shared/domain';

/** Unknown id, not a DISTRIBUTOR, or not ACTIVE: one error so callers cannot tell which. */
export class DistributorNotFoundException extends DomainException {
  constructor(distributorId: string) {
    super(
      'USER_DISTRIBUTOR_NOT_FOUND',
      `Distributor ${distributorId} not found`,
      EDomainErrorType.NOT_FOUND,
      {
        distributorId,
      },
    );
  }
}
