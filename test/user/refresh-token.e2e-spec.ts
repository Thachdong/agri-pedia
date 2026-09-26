import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address: {
    province: 'Can Tho',
    ward: 'Ninh Kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
    isPrimary: true,
  },
};

describe('POST /auth/refresh-token (e2e)', () => {
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
  const refresh = (refreshToken: unknown) =>
    http().post('/auth/refresh-token').send({ refreshToken });

  const login = async (): Promise<string> => {
    await http().post('/auth/register').send(farmer).expect(201);
    const res = await http()
      .post('/auth/login')
      .send({
        loginType: 'EMAIL',
        identifier: farmer.identifier,
        password: farmer.password,
      })
      .expect(200);
    return res.body.refreshToken;
  };

  const statuses = async (): Promise<string[]> =>
    (
      await dataSource.query(
        'SELECT status FROM refresh_tokens ORDER BY issued_at, status',
      )
    ).map((row: { status: string }) => row.status);

  it('returns a new token pair and rotates the old token', async () => {
    const first = await login();

    const res = await refresh(first).expect(200);

    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(res.body.refreshToken).not.toBe(first);
    expect(await statuses()).toEqual(['ROTATED', 'ACTIVE']);

    await refresh(res.body.refreshToken).expect(200);
  });

  it('accepts a retry of a just-rotated token within the grace period', async () => {
    const first = await login();
    await refresh(first).expect(200);

    const retry = await refresh(first).expect(200);

    expect(retry.body.refreshToken).toEqual(expect.any(String));
    expect(await statuses()).toEqual(['ROTATED', 'ROTATED', 'ACTIVE']);
  });

  it('serializes concurrent refreshes of the same token', async () => {
    const first = await login();

    const results = await Promise.all([refresh(first), refresh(first)]);

    expect(results.map((res) => res.status)).toEqual([200, 200]);
    const rows = await dataSource.query(
      "SELECT rotated_from_id FROM refresh_tokens WHERE status = 'ACTIVE'",
    );
    expect(rows).toHaveLength(1);
    const children = await dataSource.query(
      'SELECT rotated_from_id, COUNT(*)::int AS n FROM refresh_tokens WHERE rotated_from_id IS NOT NULL GROUP BY rotated_from_id',
    );
    expect(children.every((row: { n: number }) => row.n === 1)).toBe(true);
  });

  it('revokes the family when a rotated token is reused past the grace period', async () => {
    const first = await login();
    const second = await refresh(first).expect(200);
    await dataSource.query(
      "UPDATE refresh_tokens SET issued_at = issued_at - interval '1 minute'",
    );

    const res = await refresh(first).expect(401);

    expect(res.body.code).toBe('USER_INVALID_REFRESH_TOKEN');
    expect(await statuses()).toEqual(['REVOKED', 'REVOKED']);
    await refresh(second.body.refreshToken).expect(401);
  });

  it('returns 401 for an expired token without revoking it', async () => {
    const first = await login();
    await dataSource.query(
      "UPDATE refresh_tokens SET expired_at = now() - interval '1 second'",
    );

    const res = await refresh(first).expect(401);

    expect(res.body.code).toBe('USER_INVALID_REFRESH_TOKEN');
    expect(await statuses()).toEqual(['ACTIVE']);
  });

  it('returns 401 for an unknown token', async () => {
    const res = await refresh('not-a-real-token').expect(401);
    expect(res.body.code).toBe('USER_INVALID_REFRESH_TOKEN');
  });

  it('returns 400 for an invalid body', async () => {
    await refresh(123).expect(400);
    await refresh('').expect(400);
  });
});
