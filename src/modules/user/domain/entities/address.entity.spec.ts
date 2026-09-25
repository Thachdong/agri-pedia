import { Coordinates } from '../value-objects/coordinates.vo';
import { Address } from './address.entity';

describe('Address.createPrimary', () => {
  it('creates a primary address with trimmed fields', () => {
    const address = Address.createPrimary({
      userId: 'user-1',
      province: ' Can Tho ',
      ward: ' Ninh Kieu ',
      houseNumber: ' 12 ',
      coordinates: Coordinates.create(10.03, 105.78),
    });
    expect(address.id).toEqual(expect.any(String));
    expect(address.isPrimary).toBe(true);
    expect(address.userId).toBe('user-1');
    expect(address.province).toBe('Can Tho');
    expect(address.ward).toBe('Ninh Kieu');
    expect(address.houseNumber).toBe('12');
    expect(address.coordinates.lat).toBe(10.03);
  });
});
