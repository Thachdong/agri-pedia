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

const unknownId = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';

type TUser = { id: string; token: string };

describe('socket chat.room.enter / chat.room.leave + unread (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let url: string;
  let sockets: Socket[] = [];
  let farmer: TUser;
  let shop: TUser;
  let farmerSocket: Socket;
  let roomId: string;

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
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM chat_rooms');
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    shop = await signUp(distributorAccount('0912345678'));
    farmer = await signUp(farmerAccount('farmer@mail.com'));
    farmerSocket = await connect(farmer.token);
    ({ roomId } = await send(farmerSocket, {
      receiverId: shop.id,
      message: 'Chào anh',
    }));
  });

  afterEach(() => {
    sockets.forEach((socket) => socket.disconnect());
    sockets = [];
  });

  afterAll(async () => {
    await app.close();
  });

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object): Promise<TUser> => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(201);
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

  const emit = (socket: Socket, event: string, body: unknown) =>
    socket.timeout(3000).emitWithAck(event, body);
  const send = (socket: Socket, body: unknown) =>
    emit(socket, 'chat.message.send', body);
  const enter = (socket: Socket, id = roomId) =>
    emit(socket, 'chat.room.enter', { roomId: id });
  const leave = (socket: Socket, id = roomId) =>
    emit(socket, 'chat.room.leave', { roomId: id });

  const farmerSays = (message: string) =>
    send(farmerSocket, { roomId, message });

  const unreadOf = async (user: TUser) => {
    const res = await request(app.getHttpServer())
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    return {
      total: res.body.totalUnread,
      room: res.body.rooms[0]?.unreadCount,
    };
  };

  /** Lets the server process a client disconnect. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

  it('counts messages as unread while the receiver has not opened the room', async () => {
    await connect(shop.token); // online, but chat window closed
    await farmerSays('Còn lúa giống không?');

    expect(await unreadOf(shop)).toEqual({ total: 2, room: 2 });
    expect(await unreadOf(farmer)).toEqual({ total: 0, room: 0 });
  });

  it('enter marks everything read, and messages arriving while open stay read', async () => {
    const shopSocket = await connect(shop.token);

    expect(await enter(shopSocket)).toEqual({ roomId });
    expect(await unreadOf(shop)).toEqual({ total: 0, room: 0 });

    await farmerSays('Còn lúa giống không?');
    expect(await unreadOf(shop)).toEqual({ total: 0, room: 0 });
  });

  it('after leave, new messages are unread again', async () => {
    const shopSocket = await connect(shop.token);
    await enter(shopSocket);

    expect(await leave(shopSocket)).toEqual({ roomId });
    await farmerSays('Anh ơi');

    expect(await unreadOf(shop)).toEqual({ total: 1, room: 1 });
  });

  it('after disconnect, new messages are unread again', async () => {
    const shopSocket = await connect(shop.token);
    await enter(shopSocket);

    shopSocket.disconnect();
    await settle();
    await farmerSays('Anh ơi');

    expect(await unreadOf(shop)).toEqual({ total: 1, room: 1 });
  });

  it('reads on arrival if any device of the receiver has the room open', async () => {
    const phone = await connect(shop.token);
    await connect(shop.token); // laptop, room not open
    await enter(phone);

    await farmerSays('Anh ơi');

    expect(await unreadOf(shop)).toEqual({ total: 0, room: 0 });
  });

  it('entering another room does not mark this one read on arrival', async () => {
    const other = await signUp(farmerAccount('other@mail.com'));
    const otherSocket = await connect(other.token);
    const { roomId: otherRoomId } = await send(otherSocket, {
      receiverId: shop.id,
      message: 'Hi',
    });
    const shopSocket = await connect(shop.token);
    await enter(shopSocket, otherRoomId);

    await farmerSays('Anh ơi');

    expect(await unreadOf(shop)).toEqual({ total: 2, room: 2 });
  });

  it('rejects enter of an unknown room or by a non-member', async () => {
    const outsider = await signUp(farmerAccount('outsider@mail.com'));
    const outsiderSocket = await connect(outsider.token);

    expect((await enter(outsiderSocket, unknownId)).error.code).toBe(
      'CHAT_ROOM_NOT_FOUND',
    );
    expect((await enter(outsiderSocket)).error.code).toBe(
      'CHAT_NOT_ROOM_MEMBER',
    );
  });

  it.each(['chat.room.enter', 'chat.room.leave'])(
    'rejects a malformed %s payload',
    async (event) => {
      expect(
        (await emit(farmerSocket, event, { roomId: 'abc' })).error.code,
      ).toBe('REALTIME_VALIDATION_FAILED');
    },
  );
});
