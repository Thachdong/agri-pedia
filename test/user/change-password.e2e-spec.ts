import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const address = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
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

describe('POST /auth/change-password (e2e)', () => {
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
    return (await login(identifier, 'secret123').expect(200)).body;
  };

  const login = (identifier: string, password: string) =>
    http()
      .post('/auth/login')
      .send({ loginType: 'EMAIL', identifier, password });

  const changePassword = (accessToken: string | null, body: object) => {
    const req = http().post('/auth/change-password');
    if (accessToken !== null) {
      req.set('Authorization', `Bearer ${accessToken}`);
    }
    return req.send(body);
  };

  const refresh = (refreshToken: string) =>
    http().post('/auth/refresh-token').send({ refreshToken });

  it('changes the password and ends every session', async () => {
    const phone = await signUpAndLogin('farmer@mail.com');
    const laptop = (await login('farmer@mail.com', 'secret123').expect(200))
      .body as TSession;

    await changePassword(phone.accessToken, {
      oldPassword: 'secret123',
      newPassword: 'new-secret456',
    }).expect(200, '');

    await login('farmer@mail.com', 'secret123').expect(401);
    await login('farmer@mail.com', 'new-secret456').expect(200);
    await refresh(phone.refreshToken).expect(401);
    await refresh(laptop.refreshToken).expect(401);
  });

  it('returns 400 USER_WRONG_PASSWORD and changes nothing for a wrong old password', async () => {
    const session = await signUpAndLogin('farmer@mail.com');

    const res = await changePassword(session.accessToken, {
      oldPassword: 'wrong-pass',
      newPassword: 'new-secret456',
    }).expect(400);
    expect(res.body.code).toBe('USER_WRONG_PASSWORD');

    await login('farmer@mail.com', 'secret123').expect(200);
    await refresh(session.refreshToken).expect(200);
  });

  it('returns 401 without a valid access token', async () => {
    const body = { oldPassword: 'secret123', newPassword: 'new-secret456' };

    const missing = await changePassword(null, body).expect(401);
    expect(missing.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    await changePassword('garbage', body).expect(401);
  });

  it('returns 400 for an invalid body', async () => {
    const session = await signUpAndLogin('farmer@mail.com');

    await changePassword(session.accessToken, {}).expect(400);
    await changePassword(session.accessToken, {
      oldPassword: 'secret123',
      newPassword: 'short',
    }).expect(400);
    await changePassword(session.accessToken, {
      oldPassword: 'secret123',
      newPassword: 'new-secret456',
      extra: true,
    }).expect(400);
  });
});
