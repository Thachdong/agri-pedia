import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { AddressNotFoundException } from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';

export type TDeleteAddressInput = {
  /** Caller, from the access token. */
  userId: string;
  addressId: string;
};

/** Hard-deletes one of the caller's addresses; the primary one is kept. */
@Injectable()
export class DeleteAddressUseCase {
  constructor(
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TDeleteAddressInput): Promise<void> {
    await this.unitOfWork.runInTransaction(async () => {
      const address = await this.addresses.findById(input.addressId);
      if (!address || address.userId !== input.userId) {
        throw new AddressNotFoundException(input.addressId);
      }
      address.assertDeletable();
      await this.addresses.delete(address);
    });
  }
}
