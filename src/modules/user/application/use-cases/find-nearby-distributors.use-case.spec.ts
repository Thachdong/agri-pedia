import { IConfigService } from '@shared/config';
import { ILocationQueryPort } from '@modules/location/contracts';
import {
  Address,
  Coordinates,
  EBusinessType,
  ELoginType,
  EUserRole,
  InvalidCoordinatesException,
  InvalidLocationException,
  NearbySearchFarmerOnlyException,
  User,
  UserNotFoundException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryDistributorSearchRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import {
  FindNearbyDistributorsUseCase,
  TFindNearbyDistributorsInput,
} from './find-nearby-distributors.use-case';

// Stubbed master data: can_tho (phuong_ninh_kieu, phuong_cai_rang), ha_noi (phuong_ba_dinh), da_nang.
const wardsByProvince: Record<string, string[]> = {
  can_tho: ['phuong_ninh_kieu', 'phuong_cai_rang'],
  ha_noi: ['phuong_ba_dinh'],
  da_nang: [],
};
const locationQuery: ILocationQueryPort = {
  provinceExists: async (provinceCode) => provinceCode in wardsByProvince,
  wardBelongsToProvince: async (provinceCode, wardCode) =>
    wardsByProvince[provinceCode]?.includes(wardCode) ?? false,
};

const NINH_KIEU = { lat: 10.03, long: 105.78 };
const DA_NANG = { lat: 16.05, long: 108.2 };

describe('FindNearbyDistributorsUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let radiusKm: number;
  let useCase: FindNearbyDistributorsUseCase;
  let farmer: User;

  const addUser = async (
    username: string,
    role: EUserRole,
    active: boolean,
    address: {
      province: string;
      ward: string;
      lat: number;
      long: number;
    } | null,
  ): Promise<User> => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: `hash(${username})`,
      encryptedIdentifier: `enc(${username})`,
      passwordHash: 'pwd',
      username,
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
    });
    if (active) {
      user.activate();
    }
    await users.save(user);
    if (address) {
      await addresses.save(
        Address.createPrimary({
          userId: user.id,
          province: address.province,
          ward: address.ward,
          houseNumber: '1',
          coordinates: Coordinates.create(address.lat, address.long),
        }),
      );
    }
    return user;
  };

  const run = (input: Partial<TFindNearbyDistributorsInput> = {}) =>
    useCase.execute({ userId: farmer.id, page: 1, limit: 20, ...input });

  const names = (output: { items: { username: string }[] }) =>
    output.items.map((item) => item.username);

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    radiusKm = 30;
    const config = {
      get: () => ({ radiusKm }),
    } as unknown as IConfigService;
    useCase = new FindNearbyDistributorsUseCase(
      users,
      addresses,
      new InMemoryDistributorSearchRepository(users, addresses),
      locationQuery,
      config,
    );
    farmer = await addUser('farmer', EUserRole.FARMER, true, {
      province: 'can_tho',
      ward: 'phuong_ninh_kieu',
      ...NINH_KIEU,
    });
  });

  const seedDistributors = async () => {
    // ~1.5 km from Ninh Kieu
    await addUser('an', EUserRole.DISTRIBUTOR, true, {
      province: 'can_tho',
      ward: 'phuong_ninh_kieu',
      lat: 10.04,
      long: 105.79,
    });
    // ~11 km from Ninh Kieu
    await addUser('binh', EUserRole.DISTRIBUTOR, true, {
      province: 'can_tho',
      ward: 'phuong_cai_rang',
      lat: 10.1,
      long: 105.85,
    });
    // ~1,100 km from Ninh Kieu
    await addUser('cuong', EUserRole.DISTRIBUTOR, true, {
      province: 'ha_noi',
      ward: 'phuong_ba_dinh',
      lat: 21.03,
      long: 105.85,
    });
    // Excluded: not activated, or not a distributor.
    await addUser('pending', EUserRole.DISTRIBUTOR, false, {
      province: 'can_tho',
      ward: 'phuong_ninh_kieu',
      ...NINH_KIEU,
    });
    await addUser('other-farmer', EUserRole.FARMER, true, {
      province: 'can_tho',
      ward: 'phuong_ninh_kieu',
      ...NINH_KIEU,
    });
  };

  describe('point from the request', () => {
    beforeEach(seedDistributors);

    it('lists ACTIVE distributors within the radius, nearest first, with distance and shop address', async () => {
      const output = await run({ location: { kind: 'point', ...NINH_KIEU } });

      expect(output).toMatchObject({
        scope: 'radius',
        source: 'query_point',
        total: 2,
      });
      expect(names(output)).toEqual(['an', 'binh']);
      expect(output.items[0].distanceMeters).toBeGreaterThan(1000);
      expect(output.items[0].distanceMeters).toBeLessThan(2000);
      expect(output.items[1].address).toEqual({
        province: 'can_tho',
        ward: 'phuong_cai_rang',
        houseNumber: '1',
        lat: 10.1,
        long: 105.85,
      });
      expect(output.items[0]).toMatchObject({
        avatar: null,
        businessType: EBusinessType.SEEDS_SEEDLINGS,
      });
    });

    it('uses the configured radius', async () => {
      radiusKm = 5;
      const output = await run({ location: { kind: 'point', ...NINH_KIEU } });
      expect(names(output)).toEqual(['an']);
    });

    it('falls back to every distributor by distance when none is within the radius', async () => {
      const output = await run({ location: { kind: 'point', ...DA_NANG } });

      expect(output).toMatchObject({
        scope: 'nationwide_by_distance',
        source: 'query_point',
        total: 3,
      });
      expect(names(output)).toEqual(['cuong', 'binh', 'an']);
    });

    it('paginates inside the matching stage', async () => {
      const output = await run({
        location: { kind: 'point', ...NINH_KIEU },
        page: 2,
        limit: 1,
      });
      expect(output).toMatchObject({ scope: 'radius', total: 2 });
      expect(names(output)).toEqual(['binh']);
    });

    it('keeps the stage when the page is past its end', async () => {
      const output = await run({
        location: { kind: 'point', ...NINH_KIEU },
        page: 3,
        limit: 1,
      });
      expect(output).toMatchObject({ scope: 'radius', total: 2, items: [] });
    });

    it('rejects invalid coordinates', async () => {
      await expect(
        run({ location: { kind: 'point', lat: 91, long: 0 } }),
      ).rejects.toThrow(InvalidCoordinatesException);
    });
  });

  describe('area from the request', () => {
    beforeEach(seedDistributors);

    it('lists the province with the given ward first, without distance', async () => {
      const output = await run({
        location: {
          kind: 'area',
          provinceCode: ' can_tho ',
          wardCode: 'phuong_cai_rang',
        },
      });

      expect(output).toMatchObject({
        scope: 'province',
        source: 'query_area',
        total: 2,
      });
      expect(names(output)).toEqual(['binh', 'an']);
      expect(output.items.map((item) => item.distanceMeters)).toEqual([
        null,
        null,
      ]);
    });

    it('lists the province by name when no ward is given', async () => {
      const output = await run({
        location: { kind: 'area', provinceCode: 'can_tho' },
      });
      expect(names(output)).toEqual(['an', 'binh']);
    });

    it('falls back to every distributor by name when the province has none', async () => {
      const output = await run({
        location: { kind: 'area', provinceCode: 'da_nang' },
      });

      expect(output).toMatchObject({
        scope: 'nationwide',
        source: 'query_area',
        total: 3,
      });
      expect(names(output)).toEqual(['an', 'binh', 'cuong']);
    });

    it.each([
      ['unknown', undefined],
      ['can_tho', 'phuong_unknown'],
      ['ha_noi', 'phuong_ninh_kieu'],
    ])('rejects unknown location (%p, %p)', async (provinceCode, wardCode) => {
      await expect(
        run({ location: { kind: 'area', provinceCode, wardCode } }),
      ).rejects.toThrow(InvalidLocationException);
    });
  });

  describe('no location in the request', () => {
    it("searches around the caller's primary address", async () => {
      await seedDistributors();
      const output = await run();

      expect(output).toMatchObject({ scope: 'radius', source: 'address' });
      expect(names(output)).toEqual(['an', 'binh']);
    });

    it('lists every distributor by name when the caller has no address', async () => {
      await seedDistributors();
      farmer = await addUser('farmer-no-address', EUserRole.FARMER, true, null);

      const output = await run();

      expect(output).toMatchObject({ scope: 'nationwide', source: 'none' });
      expect(names(output)).toEqual(['an', 'binh', 'cuong']);
    });
  });

  it('returns an empty last stage when there is no distributor at all', async () => {
    const output = await run({ location: { kind: 'point', ...NINH_KIEU } });
    expect(output).toEqual({
      scope: 'nationwide_by_distance',
      source: 'query_point',
      total: 0,
      items: [],
    });
  });

  it('rejects a caller who is not a farmer', async () => {
    const distributor = await addUser(
      'shop',
      EUserRole.DISTRIBUTOR,
      true,
      null,
    );
    await expect(
      useCase.execute({ userId: distributor.id, page: 1, limit: 20 }),
    ).rejects.toThrow(NearbySearchFarmerOnlyException);
  });

  it('rejects an unknown caller', async () => {
    await expect(
      useCase.execute({ userId: 'missing', page: 1, limit: 20 }),
    ).rejects.toThrow(UserNotFoundException);
  });
});
