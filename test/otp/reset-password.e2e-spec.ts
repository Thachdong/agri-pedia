import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { InMemoryMessageSender, MESSAGE_SENDER } from '@shared/messaging';
import { AppModule } from '../../src/app.module';

const address = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
};

const farmer = {
  loginType: 'EMAIL',
  identifier: 'Farmer@Mail.com',
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912 345 678',
  password: 'secret123',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

describe('POST /auth/reset-password (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let crypto: ICryptoService;
  const messages = new InMemoryMessageSender();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MESSAGE_SENDER)
      .useValue(messages)
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    crypto = app.get(CRYPTO_SERVICE);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    messages.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const resetPassword = (body: object) =>
    http().post('/auth/reset-password').send(body);
  const farmerReset = () =>
    resetPassword({ loginType: 'EMAIL', identifier: ' FARMER@mail.com ' });

  const resetOtps = () =>
    dataSource.query(
      "SELECT hash_code, sender, is_consumed FROM otps WHERE purpose = 'RESET_PASSWORD' ORDER BY issued_at",
    );

  it('stores a RESET_PASSWORD otp and sends its code', async () => {
    await http().post('/auth/register').send(farmer).expect(201);

    await farmerReset().expect(200, '');

    const [otp] = await resetOtps();
    expect(otp).toMatchObject({ sender: 'EMAIL', is_consumed: false });
    const code = crypto.decrypt(otp.hash_code);
    expect(messages.sent).toEqual([
      expect.objectContaining({
        channel: 'EMAIL',
        to: 'farmer@mail.com',
        body: expect.stringContaining(code),
      }),
    ]);
  });

  it('returns 409 with issue and expiry times while the code is valid', async () => {
    await http().post('/auth/register').send(farmer).expect(201);
    await farmerReset().expect(200);

    const res = await farmerReset().expect(409);

    expect(res.body.code).toBe('OTP_ALREADY_REQUESTED');
    expect(res.body.details).toEqual({
      purpose: 'RESET_PASSWORD',
      issuedAt: expect.any(String),
      expiredAt: expect.any(String),
    });
    expect(await resetOtps()).toHaveLength(1);
    expect(messages.sent).toHaveLength(1);
  });

  it('sends a new code once the previous one expired', async () => {
    await http().post('/auth/register').send(farmer).expect(201);
    await farmerReset().expect(200);
    await dataSource.query(
      "UPDATE otps SET issued_at = now() - interval '10 minutes', expired_at = now() - interval '5 minutes'",
    );

    await farmerReset().expect(200);

    expect(await resetOtps()).toHaveLength(2);
    expect(messages.sent).toHaveLength(2);
  });

  it('returns 422 while the previous code is blocked', async () => {
    await http().post('/auth/register').send(farmer).expect(201);
    await farmerReset().expect(200);
    await dataSource.query(
      "UPDATE otps SET expired_at = now() - interval '1 minute', block_until = now() + interval '10 minutes', block_reason = 'WRONG_COUNT_MAXIMUM'",
    );

    const res = await farmerReset().expect(422);

    expect(res.body.code).toBe('OTP_BLOCKED');
    expect(res.body.details.blockUntil).toEqual(expect.any(String));
  });

  it('returns 404 for an unknown identifier or a wrong login type', async () => {
    await http().post('/auth/register').send(farmer).expect(201);

    const unknown = await resetPassword({
      loginType: 'EMAIL',
      identifier: 'nobody@mail.com',
    }).expect(404);
    expect(unknown.body.code).toBe('OTP_ACCOUNT_NOT_FOUND');
    await resetPassword({
      loginType: 'PHONE',
      identifier: 'farmer@mail.com',
    }).expect(404);
    expect(messages.sent).toHaveLength(0);
  });

  it('returns 403 for a distributor not activated yet', async () => {
    await http().post('/auth/register').send(distributor).expect(201);
    messages.sent.length = 0;

    const res = await resetPassword({
      loginType: 'PHONE',
      identifier: '0912-345-678',
    }).expect(403);

    expect(res.body.code).toBe('OTP_ACCOUNT_NOT_ACTIVE');
    expect(await resetOtps()).toHaveLength(0);
  });

  it('returns 400 for an invalid body', async () => {
    await resetPassword({ loginType: 'FAX', identifier: '' }).expect(400);
  });
});
