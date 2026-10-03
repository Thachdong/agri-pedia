import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const newAddress = {
  province: 'ha_noi',
  ward: 'phuong_ba_dinh',
  houseNumber: '5',
  lat: 21.03,
  long: 105.85,
};

describe('POST /users/me/addresses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userId: string;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  const http = () => request(app.getHttpServer());
  const tokenFor = (id: string) =>
    app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE).sign({ userId: id });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: 'farmer@mail.com',
        password: 'secret123',
        username: 'farmer',
        role: 'FARMER',
        bussinessType: null,
        address: {
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.03,
          long: 105.78,
        },
      })
      .expect(201);
    [{ id: userId }] = await dataSource.query('SELECT id FROM users');
    token = await tokenFor(userId);
  });

  afterAll(async () => {
    await app.close();
  });

  const create = (body: object, bearer: string | null = token) => {
    const req = http().post('/users/me/addresses').send(body);
    if (bearer !== null) {
      req.set('Authorization', `Bearer ${bearer}`);
    }
    return req;
  };

  const rows = (): Promise<
    { id: string; ward: string; is_primary: boolean }[]
  > =>
    dataSource.query(
      'SELECT id, ward, is_primary FROM addresses WHERE user_id = $1',
      [userId],
    );

  it('201: adds a non-primary address by default', async () => {
    const res = await create(newAddress).expect(201);

    expect(res.body).toEqual({ addressId: expect.any(String) });
    const list = await http()
      .get('/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.addresses).toEqual([
      expect.objectContaining({ ward: 'phuong_ninh_kieu', isPrimary: true }),
      {
        id: res.body.addressId,
        ...newAddress,
        isPrimary: false,
      },
    ]);
  });

  it('201: isPrimary moves the primary flag to the new address', async () => {
    const res = await create({ ...newAddress, isPrimary: true }).expect(201);

    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all.filter((row) => row.is_primary)).toEqual([
      expect.objectContaining({ id: res.body.addressId }),
    ]);
  });

  it('400 USER_LOCATION_INVALID: ward of another province', async () => {
    const res = await create({
      ...newAddress,
      ward: 'phuong_ninh_kieu',
    }).expect(400);

    expect(res.body.code).toBe('USER_LOCATION_INVALID');
    expect(await rows()).toHaveLength(1);
  });

  it('400 USER_INVALID_COORDINATES: latitude out of range', async () => {
    const res = await create({ ...newAddress, lat: 91 }).expect(400);

    expect(res.body.code).toBe('USER_INVALID_COORDINATES');
  });

  it('400: missing or unknown fields', async () => {
    await create({ ...newAddress, houseNumber: undefined }).expect(400);
    await create({ ...newAddress, isPrimary: 'yes' }).expect(400);
    await create({ ...newAddress, extra: 1 }).expect(400);
  });

  it('404 USER_NOT_FOUND: the user of the token no longer exists', async () => {
    const res = await create(newAddress, await tokenFor(randomUUID())).expect(
      404,
    );

    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('401: without a valid access token', async () => {
    const res = await create(newAddress, null).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
