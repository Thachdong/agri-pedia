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

describe('PATCH /users/me/addresses/:addressId/primary (e2e)', () => {
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

  let seq = 0;
  /** Registers a farmer and adds a second, non-primary address; returns its token and both address ids. */
  const signUp = async () => {
    seq += 1;
    const username = `farmer${seq}`;
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: `${username}@mail.com`,
        password: 'secret123',
        username,
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
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    const token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
    const [{ id: primaryId }] = await dataSource.query(
      'SELECT id FROM addresses WHERE user_id = $1',
      [id],
    );
    const created = await http()
      .post('/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: '5',
        lat: 21.03,
        long: 105.85,
      })
      .expect(201);
    return {
      userId: id as string,
      token,
      primaryId: primaryId as string,
      otherId: created.body.addressId as string,
    };
  };

  const setPrimary = (addressId: string, token: string | null) => {
    const req = http().patch(`/users/me/addresses/${addressId}/primary`);
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  const primaryIds = async (userId: string) =>
    (
      await dataSource.query(
        'SELECT id FROM addresses WHERE user_id = $1 AND is_primary',
        [userId],
      )
    ).map((row: { id: string }) => row.id);

  it('200: moves the primary flag; /users/me follows it', async () => {
    const user = await signUp();

    const res = await setPrimary(user.otherId, user.token).expect(200);

    expect(res.body).toEqual({});
    expect(await primaryIds(user.userId)).toEqual([user.otherId]);
    const me = await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(me.body.address.ward).toBe('phuong_ba_dinh');
  });

  it('200: an address that is already primary stays primary', async () => {
    const user = await signUp();

    await setPrimary(user.primaryId, user.token).expect(200);

    expect(await primaryIds(user.userId)).toEqual([user.primaryId]);
  });

  it("404 USER_ADDRESS_NOT_FOUND: another user's address", async () => {
    const owner = await signUp();
    const caller = await signUp();

    const res = await setPrimary(owner.otherId, caller.token).expect(404);

    expect(res.body.code).toBe('USER_ADDRESS_NOT_FOUND');
    expect(await primaryIds(owner.userId)).toEqual([owner.primaryId]);
    expect(await primaryIds(caller.userId)).toEqual([caller.primaryId]);
  });

  it('404 USER_ADDRESS_NOT_FOUND: unknown address', async () => {
    const user = await signUp();

    const res = await setPrimary(randomUUID(), user.token).expect(404);

    expect(res.body.code).toBe('USER_ADDRESS_NOT_FOUND');
  });

  it('400: the address id is not a uuid', async () => {
    const user = await signUp();

    await setPrimary('not-a-uuid', user.token).expect(400);
  });

  it('401: without a valid access token', async () => {
    const res = await setPrimary(randomUUID(), null).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
