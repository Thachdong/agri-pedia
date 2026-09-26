import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const address = {
  province: 'Can Tho',
  ward: 'Ninh Kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
  isPrimary: true,
};

const farmer = {
  loginType: 'EMAIL',
  identifier: 'Farmer@Mail.com',
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  bio: 'rice farmer',
  address,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912 345 678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

describe('POST /auth/login (e2e)', () => {
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
  const login = (body: object) => http().post('/auth/login').send(body);

  it('logs in an active farmer and stores the refresh token hash', async () => {
    await http().post('/auth/register').send(farmer).expect(201);

    const res = await login({
      loginType: 'EMAIL',
      identifier: ' farmer@mail.com ',
      password: 'secret123',
    }).expect(200);

    const [user] = await dataSource.query('SELECT id FROM users');
    const claims = app
      .get(JwtService)
      .verify<{ sub: string }>(res.body.accessToken);
    expect(claims.sub).toBe(user.id);
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      loginType: 'EMAIL',
      username: 'farmer@mail.com',
      role: 'FARMER',
      bussinessType: null,
      bussinessLicense: null,
      avatar: null,
      bio: 'rice farmer',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const tokens = await dataSource.query(
      'SELECT hashed_token, status FROM refresh_tokens',
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0].status).toBe('ACTIVE');
    expect(tokens[0].hashed_token).not.toBe(res.body.refreshToken);
  });

  it('returns 401 for a wrong password', async () => {
    await http().post('/auth/register').send(farmer).expect(201);

    const res = await login({
      loginType: 'EMAIL',
      identifier: farmer.identifier,
      password: 'wrong-password',
    }).expect(401);
    expect(res.body.code).toBe('USER_INVALID_CREDENTIALS');
    expect(await dataSource.query('SELECT id FROM refresh_tokens')).toEqual([]);
  });

  it('returns 401 for an unknown identifier', async () => {
    const res = await login({
      loginType: 'EMAIL',
      identifier: 'nobody@mail.com',
      password: 'secret123',
    }).expect(401);
    expect(res.body.code).toBe('USER_INVALID_CREDENTIALS');
  });

  it('returns 403 for a pending distributor', async () => {
    await http().post('/auth/register').send(distributor).expect(201);

    const res = await login({
      loginType: 'PHONE',
      identifier: '0912-345-678',
      password: 'secret123',
    }).expect(403);
    expect(res.body.code).toBe('USER_NOT_ACTIVE');
  });

  it('returns 400 for an invalid body', async () => {
    await login({ loginType: 'FAX', identifier: '', password: 1 }).expect(400);
  });
});
