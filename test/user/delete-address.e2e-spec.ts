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

describe('DELETE /users/me/addresses/:addressId (e2e)', () => {
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

  const remove = (addressId: string, token: string | null) => {
    const req = http().delete(`/users/me/addresses/${addressId}`);
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  const addressIds = async (userId: string) =>
    (
      await dataSource.query('SELECT id FROM addresses WHERE user_id = $1', [
        userId,
      ])
    ).map((row: { id: string }) => row.id);

  it('200: deletes a non-primary address', async () => {
    const user = await signUp();

    const res = await remove(user.otherId, user.token).expect(200);

    expect(res.body).toEqual({});
    expect(await addressIds(user.userId)).toEqual([user.primaryId]);
  });

  it('409 USER_ADDRESS_PRIMARY_NOT_DELETABLE: the primary address', async () => {
    const user = await signUp();

    const res = await remove(user.primaryId, user.token).expect(409);

    expect(res.body.code).toBe('USER_ADDRESS_PRIMARY_NOT_DELETABLE');
    expect(await addressIds(user.userId)).toHaveLength(2);
  });

  it('200: the former primary can be deleted once another is primary', async () => {
    const user = await signUp();
    await http()
      .patch(`/users/me/addresses/${user.otherId}/primary`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    await remove(user.primaryId, user.token).expect(200);

    expect(await addressIds(user.userId)).toEqual([user.otherId]);
  });

  it("404 USER_ADDRESS_NOT_FOUND: another user's address", async () => {
    const owner = await signUp();
    const caller = await signUp();

    const res = await remove(owner.otherId, caller.token).expect(404);

    expect(res.body.code).toBe('USER_ADDRESS_NOT_FOUND');
    expect(await addressIds(owner.userId)).toHaveLength(2);
  });

  it('404 USER_ADDRESS_NOT_FOUND: unknown address', async () => {
    const user = await signUp();

    const res = await remove(randomUUID(), user.token).expect(404);

    expect(res.body.code).toBe('USER_ADDRESS_NOT_FOUND');
  });

  it('400: the address id is not a uuid', async () => {
    const user = await signUp();

    await remove('not-a-uuid', user.token).expect(400);
  });

  it('401: without a valid access token', async () => {
    const res = await remove(randomUUID(), null).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
