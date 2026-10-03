import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { InMemoryMessageSender, MESSAGE_SENDER } from '@shared/messaging';
import { AppModule } from '../../src/app.module';

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'old-secret-123',
  role: 'FARMER',
  bussinessType: null,
  address: {
    province: 'can_tho',
    ward: 'phuong_ninh_kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
  },
};

describe('POST /auth/reset-password/confirm (e2e)', () => {
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
  const login = (password: string) =>
    http()
      .post('/auth/login')
      .send({ loginType: 'EMAIL', identifier: farmer.identifier, password });
  const confirm = (code: string, newPassword = 'new-secret-456') =>
    http()
      .post('/auth/reset-password/confirm')
      .send({ identifier: ' Farmer@Mail.com ', code, newPassword });

  /** Registers the farmer, logs in once, requests a reset; returns the plain code and the session. */
  const requestReset = async () => {
    await http().post('/auth/register').send(farmer).expect(201);
    const session = (await login(farmer.password).expect(200)).body;
    await http()
      .post('/auth/reset-password')
      .send({ loginType: 'EMAIL', identifier: farmer.identifier })
      .expect(200);
    const [otp] = await dataSource.query(
      "SELECT hash_code FROM otps WHERE purpose = 'RESET_PASSWORD'",
    );
    return {
      code: crypto.decrypt(otp.hash_code),
      refreshToken: session.refreshToken as string,
    };
  };

  it('sets the new password and ends every session', async () => {
    const { code, refreshToken } = await requestReset();

    await confirm(code).expect(200, '');

    await login('old-secret-123').expect(401);
    await login('new-secret-456').expect(200);
    await http().post('/auth/refresh-token').send({ refreshToken }).expect(401);
    const [otp] = await dataSource.query(
      "SELECT is_consumed FROM otps WHERE purpose = 'RESET_PASSWORD'",
    );
    expect(otp.is_consumed).toBe(true);
  });

  it('rejects a reused code', async () => {
    const { code } = await requestReset();
    await confirm(code).expect(200);

    const res = await confirm(code, 'another-secret-789').expect(422);

    expect(res.body.code).toBe('OTP_ALREADY_CONSUMED');
    await login('new-secret-456').expect(200);
  });

  it('counts a wrong code, then blocks', async () => {
    const { code } = await requestReset();
    const wrong = code === '000000' ? '111111' : '000000';

    const { maxWrongCount } = app
      .get<IConfigService>(CONFIG_SERVICE)
      .get('otp');
    for (let attempt = 0; attempt < maxWrongCount; attempt++) {
      const res = await confirm(wrong).expect(400);
      expect(res.body.code).toBe('OTP_INVALID_CODE');
    }
    const blocked = await confirm(wrong).expect(422);
    expect(blocked.body.code).toBe('OTP_BLOCKED');
    await confirm(code).expect(422);

    await login('old-secret-123').expect(200);
  });

  it('rejects an expired code', async () => {
    const { code } = await requestReset();
    await dataSource.query(
      "UPDATE otps SET expired_at = now() - interval '1 second'",
    );

    const res = await confirm(code).expect(422);

    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  it('returns 404 when no reset was requested', async () => {
    await http().post('/auth/register').send(farmer).expect(201);

    const res = await confirm('123456').expect(404);

    expect(res.body.code).toBe('OTP_NOT_FOUND');
  });

  it('returns 400 for an invalid body', async () => {
    await confirm('12ab').expect(400);
    await confirm('123456', 'short').expect(400);
  });
});
