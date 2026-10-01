import { PrimaryAddressNotDeletableException } from '../exceptions/primary-address-not-deletable.exception';
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

describe('Address.create', () => {
  const input = {
    userId: 'user-1',
    province: ' ha_noi ',
    ward: ' phuong_ba_dinh ',
    houseNumber: ' 5 ',
    coordinates: Coordinates.create(21.03, 105.85),
  };

  it('creates a non-primary address with trimmed fields by default', () => {
    const address = Address.create(input);
    expect(address.id).toEqual(expect.any(String));
    expect(address.isPrimary).toBe(false);
    expect(address.userId).toBe('user-1');
    expect(address.province).toBe('ha_noi');
    expect(address.ward).toBe('phuong_ba_dinh');
    expect(address.houseNumber).toBe('5');
    expect(address.coordinates.long).toBe(105.85);
  });

  it('creates a primary address when asked', () => {
    expect(Address.create({ ...input, isPrimary: true }).isPrimary).toBe(true);
  });
});

describe('Address primary flag', () => {
  const create = (isPrimary: boolean) =>
    Address.create({
      userId: 'user-1',
      province: 'ha_noi',
      ward: 'phuong_ba_dinh',
      houseNumber: '5',
      coordinates: Coordinates.create(21.03, 105.85),
      isPrimary,
    });

  it('markPrimary / unmarkPrimary toggle the flag', () => {
    const address = create(false);
    address.markPrimary();
    expect(address.isPrimary).toBe(true);
    address.unmarkPrimary();
    expect(address.isPrimary).toBe(false);
  });

  it('assertDeletable passes for a non-primary address', () => {
    expect(() => create(false).assertDeletable()).not.toThrow();
  });

  it('assertDeletable rejects the primary address', () => {
    expect(() => create(true).assertDeletable()).toThrow(
      PrimaryAddressNotDeletableException,
    );
  });
});
