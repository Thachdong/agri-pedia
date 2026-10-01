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
};

describe('GET /users/me/addresses (e2e)', () => {
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

  let seq = 0;
  /** Registers the user (DISTRIBUTOR stays PENDING); returns its id and an access token for it. */
  const signUp = async (role: 'FARMER' | 'DISTRIBUTOR') => {
    seq += 1;
    const username = `user${seq}`;
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: `${username}@mail.com`,
        password: 'secret123',
        username,
        role,
        bussinessType: role === 'DISTRIBUTOR' ? 'SEEDS_SEEDLINGS' : null,
        address,
      })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    return { id: id as string, token: await tokenFor(id) };
  };

  const getMyAddresses = (token: string | null) => {
    const req = http().get('/users/me/addresses');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  it('200: returns every address of the caller, primary first', async () => {
    const user = await signUp('FARMER');
    // No endpoint adds a second address yet: insert it directly.
    await dataSource.query(
      `INSERT INTO addresses (id, user_id, province, ward, house_number, lat, long, is_primary)
       VALUES ($1, $2, 'ha_noi', 'phuong_ba_dinh', '5', 21.03, 105.85, false)`,
      [randomUUID(), user.id],
    );
    await signUp('FARMER');

    const res = await getMyAddresses(user.token).expect(200);

    expect(res.body).toEqual({
      addresses: [
        {
          id: expect.any(String),
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.03,
          long: 105.78,
          isPrimary: true,
        },
        {
          id: expect.any(String),
          province: 'ha_noi',
          ward: 'phuong_ba_dinh',
          houseNumber: '5',
          lat: 21.03,
          long: 105.85,
          isPrimary: false,
        },
      ],
    });
  });

  it('200: works for a distributor that is not active', async () => {
    const user = await signUp('DISTRIBUTOR');

    const res = await getMyAddresses(user.token).expect(200);

    expect(res.body.addresses).toHaveLength(1);
  });

  it('404: the user of the token no longer exists', async () => {
    const res = await getMyAddresses(await tokenFor(randomUUID())).expect(404);

    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('401: without a valid access token', async () => {
    const missing = await getMyAddresses(null).expect(401);
    expect(missing.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    await getMyAddresses('garbage').expect(401);
  });
});
