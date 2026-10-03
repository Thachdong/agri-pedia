import { Address, Coordinates } from '../../domain';
import { AddressMapper } from './address.mapper';

describe('AddressMapper', () => {
  it('round-trips domain -> orm -> domain keeping all fields', () => {
    const address = Address.createPrimary({
      userId: 'b7d1c1a2-0000-4000-8000-000000000001',
      province: 'Can Tho',
      ward: 'Ninh Kieu',
      houseNumber: '12',
      coordinates: Coordinates.create(10.03, 105.78),
    });

    const restored = AddressMapper.toDomain(AddressMapper.toOrm(address));

    expect(AddressMapper.toOrm(restored)).toEqual(AddressMapper.toOrm(address));
  });
});
