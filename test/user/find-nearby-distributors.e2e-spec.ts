import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

type TAddress = { province: string; ward: string; lat: number; long: number };

const NINH_KIEU: TAddress = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
  lat: 10.03,
  long: 105.78,
};
// ~1.5 km from Ninh Kieu
const SHOP_AN: TAddress = { ...NINH_KIEU, lat: 10.04, long: 105.79 };
// ~11 km from Ninh Kieu
const SHOP_BINH: TAddress = {
  province: 'can_tho',
  ward: 'phuong_cai_rang',
  lat: 10.1,
  long: 105.85,
};
// ~1,100 km from Ninh Kieu
const SHOP_CUONG: TAddress = {
  province: 'ha_noi',
  ward: 'phuong_ba_dinh',
  lat: 21.03,
  long: 105.85,
};

describe('GET /distributors/nearby (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let farmerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  let seq = 0;
  /** Registers the user (DISTRIBUTOR activated unless `pending`); returns an access token for it. */
  const signUp = async (
    role: 'FARMER' | 'DISTRIBUTOR',
    username: string,
    address: TAddress,
    pending = false,
  ): Promise<string> => {
    seq += 1;
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: `user${seq}@mail.com`,
        password: 'secret123',
        username,
        role,
        bussinessType: role === 'DISTRIBUTOR' ? 'SEEDS_SEEDLINGS' : null,
        address: { ...address, houseNumber: '12' },
      })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    if (role === 'DISTRIBUTOR' && !pending) {
      await dataSource.query(
        `UPDATE users SET status = 'ACTIVE' WHERE id = $1`,
        [id],
      );
    }
    return app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
  };

  const search = (
    query: Record<string, string | number>,
    token = farmerToken,
  ) =>
    http()
      .get('/distributors/nearby')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  const names = (body: { items: { username: string }[] }) =>
    body.items.map((item) => item.username);

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    farmerToken = await signUp('FARMER', 'farmer', NINH_KIEU);
  });

  describe('with distributors', () => {
    beforeEach(async () => {
      await signUp('DISTRIBUTOR', 'an', SHOP_AN);
      await signUp('DISTRIBUTOR', 'binh', SHOP_BINH);
      await signUp('DISTRIBUTOR', 'cuong', SHOP_CUONG);
      await signUp('DISTRIBUTOR', 'pending', NINH_KIEU, true);
      await signUp('FARMER', 'other-farmer', NINH_KIEU);
    });

    it('200: point → ACTIVE distributors within the radius, nearest first', async () => {
      const { body } = await search({ lat: 10.03, long: 105.78 }).expect(200);

      expect(body).toMatchObject({
        scope: 'radius',
        source: 'query_point',
        total: 2,
      });
      expect(names(body)).toEqual(['an', 'binh']);
      expect(body.items[0]).toEqual({
        userId: expect.any(String),
        username: 'an',
        avatar: null,
        bussinessType: 'SEEDS_SEEDLINGS',
        address: {
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.04,
          long: 105.79,
        },
        distanceMeters: expect.any(Number),
      });
      expect(body.items[0].distanceMeters).toBeGreaterThan(1000);
      expect(body.items[0].distanceMeters).toBeLessThan(2000);
    });

    it('200: point with nobody in the radius → nationwide by distance', async () => {
      const { body } = await search({ lat: 16.05, long: 108.2 }).expect(200);

      expect(body).toMatchObject({
        scope: 'nationwide_by_distance',
        total: 3,
      });
      expect(names(body)).toEqual(['cuong', 'binh', 'an']);
    });

    it('200: no location → around the caller address, paginated', async () => {
      const { body } = await search({ page: 2, limit: 1 }).expect(200);

      expect(body).toMatchObject({
        scope: 'radius',
        source: 'address',
        total: 2,
      });
      expect(names(body)).toEqual(['binh']);
    });

    it('200: area → province with the ward first, no distance', async () => {
      const { body } = await search({
        provinceCode: 'can_tho',
        wardCode: 'phuong_cai_rang',
      }).expect(200);

      expect(body).toMatchObject({
        scope: 'province',
        source: 'query_area',
        total: 2,
      });
      expect(names(body)).toEqual(['binh', 'an']);
      expect(body.items[0].distanceMeters).toBeNull();
    });

    it('200: area without distributors → nationwide by name', async () => {
      const { body } = await search({ provinceCode: 'da_nang' }).expect(200);

      expect(body).toMatchObject({ scope: 'nationwide', total: 3 });
      expect(names(body)).toEqual(['an', 'binh', 'cuong']);
    });
  });

  it('200: empty list when there is no distributor', async () => {
    const { body } = await search({}).expect(200);
    expect(body).toEqual({
      scope: 'nationwide_by_distance',
      source: 'address',
      total: 0,
      items: [],
    });
  });

  it.each([
    ['point + area', { lat: 10, long: 105, provinceCode: 'can_tho' }],
    ['lat without long', { lat: 10 }],
    ['ward without province', { wardCode: 'phuong_ninh_kieu' }],
    ['non-numeric lat', { lat: 'abc', long: 105 }],
    ['bad codename', { provinceCode: 'Can Tho' }],
    ['limit over 50', { limit: 51 }],
    ['page 0', { page: 0 }],
    ['unknown param', { radius: 10 }],
  ])('400: %s', async (_label, query) => {
    await search(query as Record<string, string | number>).expect(400);
  });

  it('400 USER_INVALID_COORDINATES: lat out of range', async () => {
    const { body } = await search({ lat: 91, long: 105 }).expect(400);
    expect(body.code).toBe('USER_INVALID_COORDINATES');
  });

  it.each([
    [{ provinceCode: 'unknown' }],
    [{ provinceCode: 'ha_noi', wardCode: 'phuong_ninh_kieu' }],
  ])('400 USER_LOCATION_INVALID: %p', async (query) => {
    const { body } = await search(query).expect(400);
    expect(body.code).toBe('USER_LOCATION_INVALID');
  });

  it('401 AUTH_INVALID_ACCESS_TOKEN: no token', async () => {
    const { body } = await http().get('/distributors/nearby').expect(401);
    expect(body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('403 USER_NEARBY_SEARCH_FARMER_ONLY: caller is a distributor', async () => {
    const token = await signUp('DISTRIBUTOR', 'shop', NINH_KIEU);
    const { body } = await search({}, token).expect(403);
    expect(body.code).toBe('USER_NEARBY_SEARCH_FARMER_ONLY');
  });
});
