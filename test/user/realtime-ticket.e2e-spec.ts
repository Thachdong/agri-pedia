import { AddressInfo } from 'node:net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { io, Socket } from 'socket.io-client';
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

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'secret123',
  username: 'Farmer',
  role: 'FARMER',
  bussinessType: null,
  address,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912345678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

describe('POST /auth/realtime-ticket (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let url: string;
  let sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://localhost:${port}`;
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const tokenFor = (userId: string) =>
    app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE).sign({ userId });

  /** Registers the user (ACTIVE unless `active` is false); returns an access token for it. */
  const signUp = async (body: object, active = true) => {
    await http().post('/auth/register').send(body).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    if (active) {
      await dataSource.query(
        `UPDATE users SET status = 'ACTIVE' WHERE id = $1`,
        [id],
      );
    }
    return tokenFor(id as string);
  };

  const issueTicket = (token: string | null) => {
    const req = http().post('/auth/realtime-ticket');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  /** Resolves with the connect error message, or null when connected. */
  const connect = (auth: Record<string, unknown>) =>
    new Promise<string | null>((resolve) => {
      const socket = io(url, {
        auth,
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(null));
      socket.once('connect_error', (error) => resolve(error.message));
    });

  it('issues a ticket that opens a socket connection', async () => {
    const token = await signUp(farmer);

    const res = await issueTicket(token).expect(200);

    expect(res.body).toEqual({ ticket: expect.any(String), expiresIn: 30 });
    expect(await connect({ ticket: res.body.ticket })).toBeNull();
  });

  it('does not accept the ticket as an access token', async () => {
    const token = await signUp(farmer);
    const { body } = await issueTicket(token).expect(200);

    const res = await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${body.ticket}`)
      .expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('does not accept an access token as a ticket', async () => {
    const token = await signUp(farmer);

    expect(await connect({ ticket: token })).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('rejects a user that is not active', async () => {
    const token = await signUp(distributor, false);

    const res = await issueTicket(token).expect(403);

    expect(res.body.code).toBe('USER_NOT_ACTIVE');
  });

  it('rejects an unknown user', async () => {
    const token = await tokenFor('00000000-0000-4000-8000-000000000000');

    const res = await issueTicket(token).expect(404);

    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('rejects a request without an access token', async () => {
    const res = await issueTicket(null).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
