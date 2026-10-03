import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const farmer = {
  loginType: 'EMAIL',
  identifier: 'Farmer@Mail.com',
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address: {
    province: 'can_tho',
    ward: 'phuong_ninh_kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
    isPrimary: true,
  },
};

const distributor = {
  ...farmer,
  loginType: 'PHONE',
  identifier: '0912 345 678',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
};

describe('POST /auth/register (e2e)', () => {
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
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (body: object) =>
    request(app.getHttpServer()).post('/auth/register').send(body);

  it('registers an active farmer with a primary address, no otp', async () => {
    await register(farmer).expect(201);

    const users = await dataSource.query(
      'SELECT id, username, status, role, business_type, hashed_identifier, encrypted_identifier, password_hash FROM users',
    );
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      username: 'farmer@mail.com',
      status: 'ACTIVE',
      role: 'FARMER',
      business_type: null,
    });
    expect(users[0].encrypted_identifier).not.toContain('farmer@mail.com');
    expect(users[0].password_hash).not.toContain('secret123');

    const addresses = await dataSource.query(
      'SELECT user_id, is_primary FROM addresses',
    );
    expect(addresses).toEqual([{ user_id: users[0].id, is_primary: true }]);
    expect(await dataSource.query('SELECT id FROM otps')).toHaveLength(0);
  });

  it('registers a pending distributor and issues an activation otp', async () => {
    await register(distributor).expect(201);

    const [user] = await dataSource.query(
      'SELECT status, username, business_type, hashed_identifier FROM users',
    );
    expect(user).toMatchObject({
      status: 'PENDING',
      username: 'Seed Shop',
      business_type: 'SEEDS_SEEDLINGS',
    });

    const otps = await dataSource.query(
      'SELECT purpose, sender, hashed_identifier, is_consumed FROM otps',
    );
    expect(otps).toEqual([
      {
        purpose: 'ACTIVATE_DISTRIBUTOR',
        sender: 'PHONE',
        hashed_identifier: user.hashed_identifier,
        is_consumed: false,
      },
    ]);
  });

  it('returns 409 for an identifier already registered', async () => {
    await register(farmer).expect(201);
    const res = await register({
      ...farmer,
      identifier: ' FARMER@mail.com ',
    }).expect(409);
    expect(res.body.code).toBe('USER_IDENTIFIER_ALREADY_USED');
  });

  it('returns 400 when distributor has no business type', async () => {
    const res = await register({ ...distributor, bussinessType: null }).expect(
      400,
    );
    expect(res.body.code).toBe('USER_BUSINESS_TYPE_REQUIRED');
  });

  it('returns 400 when farmer has a business type', async () => {
    const res = await register({
      ...farmer,
      bussinessType: 'SEEDS_SEEDLINGS',
    }).expect(400);
    expect(res.body.code).toBe('USER_BUSINESS_TYPE_NOT_ALLOWED');
  });

  it('returns 400 for out-of-range coordinates', async () => {
    const res = await register({
      ...farmer,
      address: { ...farmer.address, lat: 95 },
    }).expect(400);
    expect(res.body.code).toBe('USER_INVALID_COORDINATES');
  });

  it.each([
    ['invalid email', { identifier: 'not-an-email' }],
    ['phone for EMAIL', { identifier: '0912345678' }],
    ['short password', { password: '123' }],
    ['unknown role', { role: 'ADMIN' }],
    ['missing address', { address: undefined }],
    ['unknown field', { avatar: 'media-id' }],
  ])('returns 400 for %s', async (_case, patch) => {
    await register({ ...farmer, ...patch }).expect(400);
    expect(await dataSource.query('SELECT id FROM users')).toHaveLength(0);
  });

  it('returns 400 for an invalid phone number', async () => {
    await register({ ...distributor, identifier: '12345' }).expect(400);
  });
});
