import { Address, Coordinates } from '../../domain';
import { AddressOrmEntity } from './address.orm-entity';

export class AddressMapper {
  static toDomain(row: AddressOrmEntity): Address {
    return Address.restore(row.id, {
      userId: row.userId,
      province: row.province,
      ward: row.ward,
      houseNumber: row.houseNumber,
      coordinates: Coordinates.create(row.lat, row.long),
      isPrimary: row.isPrimary,
    });
  }

  static toOrm(address: Address): AddressOrmEntity {
    return Object.assign(new AddressOrmEntity(), {
      id: address.id,
      userId: address.userId,
      province: address.province,
      ward: address.ward,
      houseNumber: address.houseNumber,
      lat: address.coordinates.lat,
      long: address.coordinates.long,
      isPrimary: address.isPrimary,
    });
  }
}
