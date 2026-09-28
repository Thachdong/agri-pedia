import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
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

const distributorAccount = (identifier: string) => ({
  loginType: 'PHONE',
  identifier,
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
});

const farmerAccount = (identifier: string) => ({
  loginType: 'EMAIL',
  identifier,
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address,
});

type TUser = { id: string; token: string };

describe('socket notification.created (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let url: string;
  let sockets: Socket[] = [];
  let shop: TUser;
  let otherShop: TUser;
  let farmer: TUser;

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
    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM reviews');
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    shop = await signUp(distributorAccount('0912345678'));
    otherShop = await signUp(distributorAccount('0987654321'));
    farmer = await signUp(farmerAccount('farmer@mail.com'));
  });

  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** Registers an ACTIVE user; returns its id and an access token for it. */
  const signUp = async (body: object): Promise<TUser> => {
    await http().post('/auth/register').send(body).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    await dataSource.query(`UPDATE users SET status = 'ACTIVE' WHERE id = $1`, [
      id,
    ]);
    const token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
    return { id, token };
  };

  const connect = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  /** Every `notification.created` the socket gets from now on. */
  const collect = (socket: Socket) => {
    const received: Record<string, unknown>[] = [];
    socket.on('notification.created', (payload) => received.push(payload));
    return received;
  };

  /** Resolves with the next `notification.created`; rejects after 3s. */
  const next = (socket: Socket) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('no notification.created')),
        3000,
      );
      socket.once('notification.created', (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  /** The notification handler runs after the HTTP response: give it time. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  const reviewShop = (star = 5) =>
    http()
      .post('/reviews')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({
        targetType: 'USER',
        targetId: shop.id,
        content: 'Hạt giống tốt',
        star,
      })
      .expect(201);

  it('pushes a new review to the reviewed distributor, same shape as GET /notifications', async () => {
    const shopSocket = await connect(shop.token);
    const pushed = next(shopSocket);

    const { body } = await reviewShop(4);

    const payload = await pushed;
    expect(payload).toEqual({
      id: expect.any(String),
      type: 'REVIEW',
      label: 'Đánh giá mới',
      content: 'Bạn nhận được đánh giá 4 sao',
      isRead: false,
      referenceId: body.reviewId,
      createdAt: expect.any(String),
    });
    const list = await http()
      .get('/notifications')
      .set('Authorization', `Bearer ${shop.token}`)
      .expect(200);
    expect(list.body.notifications[0]).toEqual(payload);
  });

  it('pushes to every open connection of the distributor', async () => {
    const phone = await connect(shop.token);
    const laptop = await connect(shop.token);
    const onPhone = next(phone);
    const onLaptop = next(laptop);

    await reviewShop();

    expect((await onPhone).id).toBe((await onLaptop).id);
  });

  it('pushes an updated review', async () => {
    const { body } = await reviewShop(5);
    const shopSocket = await connect(shop.token);
    const pushed = next(shopSocket);

    await http()
      .patch(`/reviews/${body.reviewId}`)
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ star: 3 })
      .expect(200);

    expect(await pushed).toMatchObject({
      type: 'REVIEW',
      label: 'Đánh giá được cập nhật',
      content: 'Một đánh giá đã được cập nhật thành 3 sao',
      referenceId: body.reviewId,
    });
  });

  it('does not push to other users', async () => {
    const shopSocket = await connect(shop.token);
    const otherShopReceived = collect(await connect(otherShop.token));
    const farmerReceived = collect(await connect(farmer.token));
    const pushed = next(shopSocket);

    await reviewShop();
    await pushed;
    await settle();

    expect(otherShopReceived).toEqual([]);
    expect(farmerReceived).toEqual([]);
  });

  it('still stores the notification when the distributor is offline', async () => {
    await reviewShop();
    await settle();

    const list = await http()
      .get('/notifications')
      .set('Authorization', `Bearer ${shop.token}`)
      .expect(200);
    expect(list.body.notifications).toHaveLength(1);
  });
});
