import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const me = '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69';
const shopA = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';
const shopB = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const stranger = '9d1f3a52-6b2e-4c7d-8e9f-0a1b2c3d4e5f';

const rooms = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];

describe('GET /chat/rooms (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: me });
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM chat_rooms');
  });

  afterAll(async () => {
    await app.close();
  });

  // Seeded directly: the send API needs registered users and sockets (covered in send-chat-message e2e).
  const insertRoom = (
    id: string,
    firstUserId: string,
    secondUserId: string,
    lastMessageAt: string,
    readAt: { first?: string; second?: string } = {},
  ) =>
    dataSource.query(
      `INSERT INTO chat_rooms (id, first_user_id, second_user_id, created_at, last_message_at, first_user_last_read_at, second_user_last_read_at)
       VALUES ($1, $2, $3, '2026-09-01T00:00:00Z', $4, $5, $6)`,
      [
        id,
        firstUserId,
        secondUserId,
        lastMessageAt,
        readAt.first ?? null,
        readAt.second ?? null,
      ],
    );

  const insertMessage = async (
    roomId: string,
    senderId: string,
    message: string,
    createdAt: string,
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO chat_messages (id, room_id, sender_id, message, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
      [roomId, senderId, message, createdAt],
    );
    return id;
  };

  const list = (query: Record<string, string | number> = {}) =>
    request(app.getHttpServer())
      .get('/chat/rooms')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  it('lists my rooms, newest message first, with last message and unread counts', async () => {
    await insertRoom(rooms[0], me, shopA, '2026-09-02T01:00:00Z');
    await insertMessage(rooms[0], shopA, 'Chào anh', '2026-09-02T00:00:00Z');
    await insertMessage(rooms[0], shopA, 'Còn hàng', '2026-09-02T01:00:00Z');
    await insertRoom(rooms[1], shopB, me, '2026-09-05T00:00:00Z', {
      second: '2026-09-03T00:00:00Z',
    });
    await insertMessage(rooms[1], shopB, 'Đã đọc', '2026-09-02T12:00:00Z');
    await insertMessage(rooms[1], me, 'Của tôi', '2026-09-04T00:00:00Z');
    const newest = await insertMessage(
      rooms[1],
      shopB,
      'Chưa đọc',
      '2026-09-05T00:00:00Z',
    );
    await insertRoom(rooms[2], stranger, shopA, '2026-09-06T00:00:00Z');
    await insertMessage(
      rooms[2],
      shopA,
      'Không phải của tôi',
      '2026-09-06T00:00:00Z',
    );

    const res = await list().expect(200);

    expect(res.body).toEqual({
      totalUnread: 3,
      rooms: [
        {
          roomId: rooms[1],
          otherUserId: shopB,
          lastMessage: {
            messageId: newest,
            senderId: shopB,
            message: 'Chưa đọc',
          },
          lastMessageAt: '2026-09-05T00:00:00.000Z',
          unreadCount: 1,
        },
        {
          roomId: rooms[0],
          otherUserId: shopA,
          lastMessage: expect.objectContaining({ message: 'Còn hàng' }),
          lastMessageAt: '2026-09-02T01:00:00.000Z',
          unreadCount: 2,
        },
      ],
      nextCursor: null,
    });
  });

  it('pages with nextCursor; totalUnread stays over all rooms', async () => {
    await insertRoom(rooms[0], me, shopA, '2026-09-03T00:00:00Z');
    await insertMessage(rooms[0], shopA, 'a', '2026-09-03T00:00:00Z');
    await insertRoom(rooms[1], me, shopB, '2026-09-02T00:00:00Z');
    await insertMessage(rooms[1], shopB, 'b', '2026-09-02T00:00:00Z');

    const first = await list({ limit: 1 }).expect(200);
    const second = await list({
      limit: 1,
      cursor: first.body.nextCursor,
    }).expect(200);

    expect(
      first.body.rooms.map((room: { roomId: string }) => room.roomId),
    ).toEqual([rooms[0]]);
    expect(first.body.totalUnread).toBe(2);
    expect(
      second.body.rooms.map((room: { roomId: string }) => room.roomId),
    ).toEqual([rooms[1]]);
    expect(second.body.nextCursor).toBeNull();
  });

  it('returns an empty list for a user without rooms', async () => {
    expect((await list().expect(200)).body).toEqual({
      totalUnread: 0,
      rooms: [],
      nextCursor: null,
    });
  });

  it.each([{ limit: 0 }, { limit: 51 }, { limit: 'x' }, { extra: 1 }])(
    'rejects query %o with 400',
    async (query) => {
      await list(query).expect(400);
    },
  );

  it('rejects a tampered cursor with 400 CHAT_INVALID_CURSOR', async () => {
    const res = await list({ cursor: 'garbage' }).expect(400);
    expect(res.body.code).toBe('CHAT_INVALID_CURSOR');
  });

  it('requires an access token', async () => {
    const res = await request(app.getHttpServer())
      .get('/chat/rooms')
      .expect(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
