import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { InMemoryMessageSender, MESSAGE_SENDER } from '@shared/messaging';
import { AppModule } from '../../src/app.module';

const distributor = {
  loginType: 'EMAIL',
  identifier: 'Shop@Mail.com',
  password: 'secret123',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address: {
    province: 'Can Tho',
    ward: 'Ninh Kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
  },
};

describe('POST /auth/resend (e2e)', () => {
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
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    messages.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const resend = (identifier = 'shop@mail.com') =>
    http().post('/auth/resend').send({ identifier });

  /** Registers the distributor and returns its plain activation code. */
  const registerDistributor = async (): Promise<string> => {
    await http().post('/auth/register').send(distributor).expect(201);
    const [otp] = await dataSource.query('SELECT hash_code FROM otps');
    return crypto.decrypt(otp.hash_code);
  };

  it('sends the same code again and counts the resend', async () => {
    const code = await registerDistributor();

    await resend(' SHOP@mail.com ').expect(200, '');

    expect(messages.sent).toHaveLength(2);
    expect(messages.sent[1]).toMatchObject({
      channel: 'EMAIL',
      to: 'shop@mail.com',
    });
    expect(messages.sent[1].body).toContain(code);
    const otps = await dataSource.query('SELECT retry_count FROM otps');
    expect(otps).toEqual([{ retry_count: 1 }]);
  });

  it('blocks once the resend limit is exceeded', async () => {
    await registerDistributor();
    const maxRetry = Number(process.env.OTP_MAX_RETRY_COUNT ?? 5);
    for (let i = 0; i < maxRetry; i++) {
      await resend().expect(200);
    }

    const blocked = await resend().expect(422);
    expect(blocked.body.code).toBe('OTP_BLOCKED');
    expect(blocked.body.details.blockUntil).toEqual(expect.any(String));
    expect(messages.sent).toHaveLength(1 + maxRetry);

    const [otp] = await dataSource.query('SELECT block_reason FROM otps');
    expect(otp.block_reason).toBe('RETRY_COUNT_MAXIMUM');
    expect((await resend().expect(422)).body.code).toBe('OTP_BLOCKED');
  });

  it('issues and sends a new code when the latest one expired', async () => {
    await registerDistributor();
    await dataSource.query(
      "UPDATE otps SET expired_at = now() - interval '1 second'",
    );

    await resend().expect(200);

    const otps = await dataSource.query(
      'SELECT hash_code, retry_count FROM otps ORDER BY issued_at DESC',
    );
    expect(otps).toHaveLength(2);
    const newCode = crypto.decrypt(otps[0].hash_code);
    expect(otps[0].retry_count).toBe(0);
    expect(messages.sent[1].body).toContain(newCode);

    await http()
      .post('/auth/activate')
      .send({ identifier: 'shop@mail.com', code: newCode })
      .expect(200);
  });

  it('stays blocked when the code expired during the block', async () => {
    await registerDistributor();
    await dataSource.query(
      `UPDATE otps SET expired_at = now() - interval '1 second',
         block_until = now() + interval '1 hour', block_reason = 'RETRY_COUNT_MAXIMUM'`,
    );

    expect((await resend().expect(422)).body.code).toBe('OTP_BLOCKED');
    expect(await dataSource.query('SELECT id FROM otps')).toHaveLength(1);
  });

  it('returns 422 OTP_ALREADY_CONSUMED after activation', async () => {
    const code = await registerDistributor();
    await http()
      .post('/auth/activate')
      .send({ identifier: 'shop@mail.com', code })
      .expect(200);

    expect((await resend().expect(422)).body.code).toBe('OTP_ALREADY_CONSUMED');
  });

  it('returns 404 OTP_NOT_FOUND for an unknown identifier', async () => {
    expect((await resend('nobody@mail.com').expect(404)).body.code).toBe(
      'OTP_NOT_FOUND',
    );
  });

  it.each([
    ['missing identifier', {}],
    ['empty identifier', { identifier: '' }],
    ['unknown field', { identifier: 'shop@mail.com', purpose: 'X' }],
  ])('returns 400 for %s', async (_case, body) => {
    await http().post('/auth/resend').send(body).expect(400);
  });
});
