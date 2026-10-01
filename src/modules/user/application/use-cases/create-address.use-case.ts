import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  ILocationQueryPort,
  LOCATION_QUERY_PORT,
} from '@modules/location/contracts';
import {
  Address,
  Coordinates,
  InvalidLocationException,
  UserNotFoundException,
} from '../../domain';
import {
  ADDRESS_REPOSITORY,
  IAddressRepository,
} from '../ports/address.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TCreateAddressInput = {
  /** Caller, from the access token. */
  userId: string;
  /** Province codename (location master data). */
  province: string;
  /** Ward codename, must belong to `province`. */
  ward: string;
  houseNumber: string;
  lat: number;
  long: number;
  /** Default false; true moves the primary flag from the current primary address. */
  isPrimary?: boolean;
};

export type TCreateAddressOutput = {
  addressId: string;
};

@Injectable()
export class CreateAddressUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ADDRESS_REPOSITORY)
    private readonly addresses: IAddressRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOCATION_QUERY_PORT)
    private readonly locationQuery: ILocationQueryPort,
  ) {}

  async execute(input: TCreateAddressInput): Promise<TCreateAddressOutput> {
    const coordinates = Coordinates.create(input.lat, input.long);
    const province = input.province.trim();
    const ward = input.ward.trim();
    if (!(await this.locationQuery.wardBelongsToProvince(province, ward))) {
      throw new InvalidLocationException(province, ward);
    }

    const address = await this.unitOfWork.runInTransaction(async () => {
      if (!(await this.users.findById(input.userId))) {
        throw new UserNotFoundException(input.userId);
      }
      const created = Address.create({
        userId: input.userId,
        province,
        ward,
        houseNumber: input.houseNumber,
        coordinates,
        isPrimary: input.isPrimary,
      });
      if (created.isPrimary) {
        // Unmark first: at most one primary address per user (unique index).
        const current = await this.addresses.findPrimaryByUserId(input.userId);
        if (current) {
          current.unmarkPrimary();
          await this.addresses.save(current);
        }
      }
      await this.addresses.save(created);
      return created;
    });

    return { addressId: address.id };
  }
}
