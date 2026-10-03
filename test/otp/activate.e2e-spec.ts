import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { AppModule } from '../../src/app.module';

const distributor = {
  loginType: 'PHONE',
  identifier: '0912 345 678',
  password: 'secret123',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address: {
    province: 'can_tho',
    ward: 'phuong_ninh_kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
  },
};

describe('POST /auth/activate (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let crypto: ICryptoService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    crypto = app.get(CRYPTO_SERVICE);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const activate = (body: object) => http().post('/auth/activate').send(body);

  /** Registers the distributor and returns the plain activation code. */
  const registerDistributor = async (): Promise<string> => {
    await http().post('/auth/register').send(distributor).expect(201);
    const [otp] = await dataSource.query('SELECT hash_code FROM otps');
    return crypto.decrypt(otp.hash_code);
  };

  const wrongCodeOf = (code: string) =>
    code === '000000' ? '111111' : '000000';

  const userRow = async () =>
    (
      await dataSource.query('SELECT status, identifier_verified_at FROM users')
    )[0];

  it('activates the distributor with the right code', async () => {
    const code = await registerDistributor();

    await activate({ identifier: '0912-345-678', code }).expect(200, '');

    const user = await userRow();
    expect(user.status).toBe('ACTIVE');
    expect(user.identifier_verified_at).toBeInstanceOf(Date);
    const [otp] = await dataSource.query('SELECT is_consumed FROM otps');
    expect(otp.is_consumed).toBe(true);
  });

  it('returns 400 OTP_INVALID_CODE and counts the attempt', async () => {
    const code = await registerDistributor();

    const res = await activate({
      identifier: distributor.identifier,
      code: wrongCodeOf(code),
    }).expect(400);

    expect(res.body.code).toBe('OTP_INVALID_CODE');
    const [otp] = await dataSource.query('SELECT wrong_count FROM otps');
    expect(otp.wrong_count).toBe(1);
    expect((await userRow()).status).toBe('PENDING');
  });

  it('blocks after too many wrong codes, even for the right code', async () => {
    const code = await registerDistributor();
    const wrong = {
      identifier: distributor.identifier,
      code: wrongCodeOf(code),
    };
    const maxWrong = Number(process.env.OTP_MAX_WRONG_COUNT ?? 5);
    for (let i = 0; i < maxWrong; i++) {
      await activate(wrong).expect(400);
    }

    const blocked = await activate(wrong).expect(422);
    expect(blocked.body.code).toBe('OTP_BLOCKED');
    expect(blocked.body.details.blockUntil).toEqual(expect.any(String));

    const right = await activate({ identifier: distributor.identifier, code });
    expect(right.status).toBe(422);
    expect(right.body.code).toBe('OTP_BLOCKED');
    expect((await userRow()).status).toBe('PENDING');
  });

  it('returns 422 OTP_ALREADY_CONSUMED on reuse', async () => {
    const code = await registerDistributor();
    await activate({ identifier: distributor.identifier, code }).expect(200);

    const res = await activate({ identifier: distributor.identifier, code });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OTP_ALREADY_CONSUMED');
  });

  it('returns 422 OTP_EXPIRED for an expired code', async () => {
    const code = await registerDistributor();
    await dataSource.query(
      "UPDATE otps SET expired_at = now() - interval '1 second'",
    );

    const res = await activate({ identifier: distributor.identifier, code });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  it('returns 404 OTP_NOT_FOUND for an unknown identifier', async () => {
    const res = await activate({
      identifier: 'nobody@mail.com',
      code: '123456',
    }).expect(404);
    expect(res.body.code).toBe('OTP_NOT_FOUND');
  });

  it('returns 404 OTP_NOT_FOUND for a farmer (no activation code)', async () => {
    await http()
      .post('/auth/register')
      .send({
        ...distributor,
        loginType: 'EMAIL',
        identifier: 'farmer@mail.com',
        role: 'FARMER',
        bussinessType: null,
      })
      .expect(201);

    const res = await activate({
      identifier: 'farmer@mail.com',
      code: '123456',
    }).expect(404);
    expect(res.body.code).toBe('OTP_NOT_FOUND');
  });

  it.each([
    ['missing code', { identifier: '0912345678' }],
    ['non-digit code', { identifier: '0912345678', code: '12ab56' }],
    ['empty identifier', { identifier: '', code: '123456' }],
    [
      'unknown field',
      { identifier: '0912345678', code: '123456', purpose: 'X' },
    ],
  ])('returns 400 for %s', async (_case, body) => {
    await activate(body).expect(400);
  });
});
