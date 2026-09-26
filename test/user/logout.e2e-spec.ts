import { INestApplication } from '@nestjs/common';
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

const account = (identifier: string) => ({
  loginType: 'EMAIL',
  identifier,
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address,
});

type TSession = { accessToken: string; refreshToken: string };

describe('POST /auth/logout (e2e)', () => {
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

  const signUpAndLogin = async (identifier: string): Promise<TSession> => {
    await http().post('/auth/register').send(account(identifier)).expect(201);
    return login(identifier);
  };

  const login = async (identifier: string): Promise<TSession> => {
    const res = await http()
      .post('/auth/login')
      .send({ loginType: 'EMAIL', identifier, password: 'secret123' })
      .expect(200);
    return res.body;
  };

  const logout = (accessToken: string | null, body: object) => {
    const req = http().post('/auth/logout');
    if (accessToken !== null) {
      req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req.send(body);
  };

  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh-token').send({ refreshToken });

  it('ends the current session only', async () => {
    const phone = await signUpAndLogin('farmer@mail.com');
    const laptop = await login('farmer@mail.com');
    const rotated = (await refresh(phone.refreshToken).expect(200))
      .body as TSession;

    await logout(rotated.accessToken, {
      refreshToken: rotated.refreshToken,
    }).expect(200, '');

    await refresh(rotated.refreshToken).expect(401);
    await refresh(phone.refreshToken).expect(401);
    await refresh(laptop.refreshToken).expect(200);
  });

  it('returns 200 for an unknown refresh token', async () => {
    const session = await signUpAndLogin('farmer@mail.com');

    await logout(session.accessToken, { refreshToken: 'unknown' }).expect(
      200,
      '',
    );
    await refresh(session.refreshToken).expect(200);
  });

  it("does not end another user's session", async () => {
    const victim = await signUpAndLogin('victim@mail.com');
    const attacker = await signUpAndLogin('attacker@mail.com');

    await logout(attacker.accessToken, {
      refreshToken: victim.refreshToken,
    }).expect(200, '');

    await refresh(victim.refreshToken).expect(200);
  });

  it('returns 401 without a valid access token', async () => {
    const session = await signUpAndLogin('farmer@mail.com');

    const missing = await logout(null, {
      refreshToken: session.refreshToken,
    }).expect(401);
    expect(missing.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    await logout('garbage', { refreshToken: session.refreshToken }).expect(401);

    await refresh(session.refreshToken).expect(200);
  });

  it('returns 400 for an invalid body', async () => {
    const session = await signUpAndLogin('farmer@mail.com');

    await logout(session.accessToken, {}).expect(400);
  });
});
