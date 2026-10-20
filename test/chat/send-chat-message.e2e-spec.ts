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
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
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

describe('socket chat.message.send (e2e)', () => {
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
    await dataSource.query('DELETE FROM diagnoses');
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM chat_rooms');
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

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object, activate = true): Promise<TUser> => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    if (activate) {
      await dataSource.query(
        `UPDATE users SET status = 'ACTIVE' WHERE id = $1`,
        [id],
      );
    }
    const token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
    return { id, token };
  };

  const connect = (token?: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(url, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const send = (socket: Socket, body: unknown) =>
    socket.timeout(3000).emitWithAck('chat.message.send', body);

  const nextReceived = (socket: Socket) =>
    new Promise<unknown>((resolve) =>
      socket.once('chat.message.received', resolve),
    );

  const errorCode = async (socket: Socket, body: unknown) =>
    ((await send(socket, body)) as { error?: { code: string } }).error?.code;

  it('opens a room, stores the message and pushes it to the receiver', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const shopSocket = await connect(shop.token);
    const farmerSocket = await connect(farmer.token);
    const received = nextReceived(shopSocket);

    const ack = await send(farmerSocket, {
      receiverId: shop.id,
      message: '  Còn lúa giống OM18 không?  ',
    });

    expect(ack).toEqual({
      messageId: expect.any(String),
      roomId: expect.any(String),
      createdAt: expect.any(String),
    });
    expect(await received).toEqual({
      messageId: ack.messageId,
      roomId: ack.roomId,
      senderId: farmer.id,
      senderUsername: 'farmer@mail.com', // username defaults to the identifier
      senderAvatar: null,
      message: 'Còn lúa giống OM18 không?',
      type: 'TEXT',
      diagnosisId: null,
      createdAt: ack.createdAt,
    });
    expect(await dataSource.query('SELECT * FROM chat_rooms')).toEqual([
      expect.objectContaining({
        id: ack.roomId,
        first_user_id: farmer.id,
        second_user_id: shop.id,
      }),
    ]);
    expect(await dataSource.query('SELECT * FROM chat_messages')).toEqual([
      expect.objectContaining({
        id: ack.messageId,
        room_id: ack.roomId,
        sender_id: farmer.id,
        message: 'Còn lúa giống OM18 không?',
      }),
    ]);
  });

  it('replies by roomId and reuses the room by receiverId', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const shopSocket = await connect(shop.token);
    const farmerSocket = await connect(farmer.token);
    const { roomId } = await send(farmerSocket, {
      receiverId: shop.id,
      message: 'Hi',
    });
    const received = nextReceived(farmerSocket);

    const reply = await send(shopSocket, { roomId, message: 'Còn anh' });
    const again = await send(shopSocket, {
      receiverId: farmer.id,
      message: 'Bao 10kg',
    });

    expect(reply.roomId).toBe(roomId);
    expect(again.roomId).toBe(roomId);
    expect(await received).toMatchObject({
      roomId,
      senderId: shop.id,
      message: 'Còn anh',
    });
    expect(await dataSource.query('SELECT id FROM chat_rooms')).toHaveLength(1);
  });

  it.each([undefined, 'not-a-token'])(
    'refuses the connection with token %s',
    async (token) => {
      await expect(connect(token)).rejects.toThrow('AUTH_INVALID_ACCESS_TOKEN');
    },
  );

  it.each([
    ['missing message', { receiverId: unknownId }],
    ['non-uuid roomId', { roomId: 'abc', message: 'Hi' }],
    ['unknown field', { receiverId: unknownId, message: 'Hi', extra: 1 }],
  ])('rejects %s with REALTIME_VALIDATION_FAILED', async (_case, body) => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const socket = await connect(farmer.token);

    expect(await errorCode(socket, body)).toBe('REALTIME_VALIDATION_FAILED');
  });

  it('requires roomId or receiverId', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const socket = await connect(farmer.token);

    expect(await errorCode(socket, { message: 'Hi' })).toBe(
      'CHAT_ROOM_OR_RECEIVER_REQUIRED',
    );
  });

  it('rejects a sender that is not ACTIVE', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const pendingShop = await signUp(distributorAccount('0912345678'), false);
    const socket = await connect(pendingShop.token);

    expect(
      await errorCode(socket, { receiverId: farmer.id, message: 'Hi' }),
    ).toBe('CHAT_SENDER_NOT_ALLOWED');
  });

  it('rejects an ADMIN as sender or receiver', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const admin = await signUp(farmerAccount('admin@mail.com'));
    await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [
      admin.id,
    ]);

    expect(
      await errorCode(await connect(admin.token), {
        receiverId: farmer.id,
        message: 'Hi',
      }),
    ).toBe('CHAT_SENDER_NOT_ALLOWED');
    expect(
      await errorCode(await connect(farmer.token), {
        receiverId: admin.id,
        message: 'Hi',
      }),
    ).toBe('CHAT_INVALID_RECEIVER');
    expect(await dataSource.query('SELECT id FROM chat_rooms')).toEqual([]);
  });

  it('lets only a FARMER open a room', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    expect(
      await errorCode(await connect(shop.token), {
        receiverId: farmer.id,
        message: 'Hi',
      }),
    ).toBe('CHAT_ROOM_OPEN_NOT_ALLOWED');
    expect(await dataSource.query('SELECT id FROM chat_rooms')).toEqual([]);
  });

  it('rejects an unknown receiver and room', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const socket = await connect(farmer.token);

    expect(
      await errorCode(socket, { receiverId: unknownId, message: 'Hi' }),
    ).toBe('CHAT_RECEIVER_NOT_FOUND');
    expect(await errorCode(socket, { roomId: unknownId, message: 'Hi' })).toBe(
      'CHAT_ROOM_NOT_FOUND',
    );
  });

  it('rejects a receiver with the same role, oneself, or not ACTIVE', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const otherFarmer = await signUp(farmerAccount('other@mail.com'));
    const pendingShop = await signUp(distributorAccount('0912345678'), false);
    const socket = await connect(farmer.token);

    for (const receiverId of [otherFarmer.id, farmer.id, pendingShop.id]) {
      expect(await errorCode(socket, { receiverId, message: 'Hi' })).toBe(
        'CHAT_INVALID_RECEIVER',
      );
    }
    expect(await dataSource.query('SELECT id FROM chat_rooms')).toEqual([]);
  });

  it('rejects a sender outside the room', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const outsider = await signUp(farmerAccount('other@mail.com'));
    const { roomId } = await send(await connect(farmer.token), {
      receiverId: shop.id,
      message: 'Hi',
    });
    const socket = await connect(outsider.token);

    expect(await errorCode(socket, { roomId, message: 'Hi' })).toBe(
      'CHAT_NOT_ROOM_MEMBER',
    );
    expect(await dataSource.query('SELECT id FROM chat_messages')).toHaveLength(
      1,
    );
  });

  describe('diagnosis report', () => {
    /** Inserts a diagnosis of `userId`; returns its id. */
    const seedDiagnosis = async (userId: string, status = 'COMPLETED') => {
      const [{ id }] = await dataSource.query(
        `INSERT INTO diagnoses (id, user_id, crop_type, status, provider, model, prompt_version, kb_version, created_at)
         VALUES (gen_random_uuid(), $1, 'RICE', $2, 'GEMINI', 'm', 'p', 'k', now())
         RETURNING id`,
        [userId, status],
      );
      return id as string;
    };

    const report = (diagnosisId?: string) => ({
      message: 'Báo cáo chẩn đoán lúa',
      type: 'DIAGNOSIS_REPORT',
      diagnosisId,
    });

    it('shares a completed diagnosis; both members read it over HTTP', async () => {
      const shop = await signUp(distributorAccount('0912345678'));
      const farmer = await signUp(farmerAccount('farmer@mail.com'));
      const diagnosisId = await seedDiagnosis(farmer.id);
      const shopSocket = await connect(shop.token);
      const received = nextReceived(shopSocket);

      const ack = await send(await connect(farmer.token), {
        receiverId: shop.id,
        ...report(diagnosisId),
      });

      expect(await received).toMatchObject({
        messageId: ack.messageId,
        type: 'DIAGNOSIS_REPORT',
        diagnosisId,
      });
      const listed = await request(app.getHttpServer())
        .get(`/chat/rooms/${ack.roomId}/messages`)
        .set('Authorization', `Bearer ${shop.token}`)
        .expect(200);
      expect(listed.body.messages[0]).toMatchObject({
        id: ack.messageId,
        type: 'DIAGNOSIS_REPORT',
        diagnosisId,
      });
      for (const user of [shop, farmer]) {
        const res = await request(app.getHttpServer())
          .get(`/chat/rooms/${ack.roomId}/messages/${ack.messageId}/diagnosis`)
          .set('Authorization', `Bearer ${user.token}`)
          .expect(200);
        expect(res.body).toMatchObject({
          id: diagnosisId,
          status: 'COMPLETED',
          cropType: 'RICE',
          images: [],
        });
      }
    });

    it('rejects a report from a distributor, of another farmer, not completed, or without diagnosisId', async () => {
      const shop = await signUp(distributorAccount('0912345678'));
      const farmer = await signUp(farmerAccount('farmer@mail.com'));
      const other = await signUp(farmerAccount('other@mail.com'));
      const farmerSocket = await connect(farmer.token);
      const { roomId } = await send(farmerSocket, {
        receiverId: shop.id,
        message: 'Hi',
      });

      expect(
        await errorCode(await connect(shop.token), {
          roomId,
          ...report(await seedDiagnosis(farmer.id)),
        }),
      ).toBe('CHAT_DIAGNOSIS_REPORT_NOT_ALLOWED');
      expect(
        await errorCode(farmerSocket, {
          roomId,
          ...report(await seedDiagnosis(other.id)),
        }),
      ).toBe('CHAT_DIAGNOSIS_NOT_FOUND');
      expect(
        await errorCode(farmerSocket, {
          roomId,
          ...report(await seedDiagnosis(farmer.id, 'PROCESSING')),
        }),
      ).toBe('CHAT_DIAGNOSIS_NOT_COMPLETED');
      expect(await errorCode(farmerSocket, { roomId, ...report() })).toBe(
        'CHAT_INVALID_DIAGNOSIS_REFERENCE',
      );
      expect(
        await errorCode(farmerSocket, { roomId, message: 'Hi', type: 'IMAGE' }),
      ).toBe('REALTIME_VALIDATION_FAILED');
      expect(
        await dataSource.query('SELECT id FROM chat_messages'),
      ).toHaveLength(1);
    });

    it('reads a report only as a room member, and only from a report message', async () => {
      const shop = await signUp(distributorAccount('0912345678'));
      const farmer = await signUp(farmerAccount('farmer@mail.com'));
      const outsider = await signUp(farmerAccount('other@mail.com'));
      const farmerSocket = await connect(farmer.token);
      const text = await send(farmerSocket, {
        receiverId: shop.id,
        message: 'Hi',
      });
      const shared = await send(farmerSocket, {
        roomId: text.roomId,
        ...report(await seedDiagnosis(farmer.id)),
      });
      const get = (token: string, messageId: string, roomId = text.roomId) =>
        request(app.getHttpServer())
          .get(`/chat/rooms/${roomId}/messages/${messageId}/diagnosis`)
          .set('Authorization', `Bearer ${token}`);

      expect(
        (await get(outsider.token, shared.messageId).expect(403)).body.code,
      ).toBe('CHAT_NOT_ROOM_MEMBER');
      expect(
        (await get(shop.token, text.messageId).expect(400)).body.code,
      ).toBe('CHAT_MESSAGE_NOT_DIAGNOSIS_REPORT');
      expect((await get(shop.token, unknownId).expect(404)).body.code).toBe(
        'CHAT_MESSAGE_NOT_FOUND',
      );
      expect(
        (await get(shop.token, shared.messageId, unknownId).expect(404)).body
          .code,
      ).toBe('CHAT_ROOM_NOT_FOUND');
      await request(app.getHttpServer())
        .get(
          `/chat/rooms/${text.roomId}/messages/${shared.messageId}/diagnosis`,
        )
        .expect(401);
    });
  });

  it('rejects a blank message', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const socket = await connect(farmer.token);

    expect(
      await errorCode(socket, { receiverId: shop.id, message: '   ' }),
    ).toBe('CHAT_INVALID_MESSAGE');
    expect(await dataSource.query('SELECT id FROM chat_messages')).toEqual([]);
  });
});
