import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { AddressNotFoundException } from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';

export type TSetPrimaryAddressInput = {
  /** Caller, from the access token. */
  userId: string;
  addressId: string;
};

/** Moves the primary flag to one of the caller's addresses; already primary is a no-op. */
@Injectable()
export class SetPrimaryAddressUseCase {
  constructor(
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TSetPrimaryAddressInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const address = await this.addresses.findById(input.addressId);
      if (!address || address.userId !== input.userId) {
        throw new AddressNotFoundException(input.addressId);
      }
      if (address.isPrimary) {
        return;
      }
      // Unmark first: at most one primary address per user (unique index).
      const current = await this.addresses.findPrimaryByUserId(input.userId);
      if (current) {
        current.unmarkPrimary();
        await this.addresses.save(current);
      }
      address.markPrimary();
      await this.addresses.save(address);
    });
  }
}
