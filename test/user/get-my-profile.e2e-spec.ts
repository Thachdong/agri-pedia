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

const address = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
  isPrimary: true,
};

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'secret123',
  username: 'Farmer',
  role: 'FARMER',
  bussinessType: null,
  bio: 'rice farmer',
  address,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912345678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

describe('GET /users/me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const tokenFor = (userId: string) =>
    app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE).sign({ userId });

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object) => {
    await http().post('/auth/register').send(body).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    return { id: id as string, token: await tokenFor(id) };
  };

  const getMe = (token: string | null) => {
    const req = http().get('/users/me');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  it('returns the profile of the caller with the primary address', async () => {
    const user = await signUp(farmer);

    const res = await getMe(user.token).expect(200);

    expect(res.body).toEqual({
      id: user.id,
      loginType: 'EMAIL',
      username: 'Farmer',
      role: 'FARMER',
      bussinessType: null,
      bussinessLicense: null,
      avatar: null,
      bio: 'rice farmer',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      address: {
        province: 'can_tho',
        ward: 'phuong_ninh_kieu',
        houseNumber: '12',
        lat: 10.03,
        long: 105.78,
      },
    });
  });

  it('returns the profile of a user that is not active', async () => {
    const user = await signUp(distributor);

    const res = await getMe(user.token).expect(200);

    expect(res.body.id).toBe(user.id);
    expect(res.body.role).toBe('DISTRIBUTOR');
    expect(res.body.bussinessType).toBe('SEEDS_SEEDLINGS');
  });

  it('returns 404 when the user of the token no longer exists', async () => {
    const res = await getMe(await tokenFor(randomUUID())).expect(404);

    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('returns 401 without a valid access token', async () => {
    const missing = await getMe(null).expect(401);
    expect(missing.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    await getMe('garbage').expect(401);
  });
});
