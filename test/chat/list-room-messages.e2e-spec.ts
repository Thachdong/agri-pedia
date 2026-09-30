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
const shop = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';
const stranger = '9d1f3a52-6b2e-4c7d-8e9f-0a1b2c3d4e5f';

const room = '00000000-0000-4000-8000-000000000001';
const otherRoom = '00000000-0000-4000-8000-000000000002';

describe('GET /chat/rooms/:roomId/messages (e2e)', () => {
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
    await dataSource.query('DELETE FROM chat_messages');
    await dataSource.query('DELETE FROM chat_rooms');
    await insertRoom(room, me, shop);
    await insertRoom(otherRoom, stranger, shop);
  });

  afterAll(async () => {
    await app.close();
  });

  // Seeded directly: the send API needs registered users and sockets (covered in send-chat-message e2e).
  const insertRoom = (id: string, firstUserId: string, secondUserId: string) =>
    dataSource.query(
      `INSERT INTO chat_rooms (id, first_user_id, second_user_id, created_at, last_message_at)
       VALUES ($1, $2, $3, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z')`,
      [id, firstUserId, secondUserId],
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

  const list = async (
    roomId: string,
    query: Record<string, string | number> = {},
    userId: string | null = me,
  ) => {
    const req = request(app.getHttpServer())
      .get(`/chat/rooms/${roomId}/messages`)
      .query(query);
    if (userId !== null) {
      const token = await app
        .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
        .sign({ userId });
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  it('lists the messages of the room, newest first', async () => {
    const first = await insertMessage(
      room,
      me,
      'Chào anh',
      '2026-09-02T00:00:00Z',
    );
    const second = await insertMessage(
      room,
      shop,
      'Còn hàng',
      '2026-09-02T01:00:00Z',
    );
    await insertMessage(otherRoom, shop, 'Phòng khác', '2026-09-03T00:00:00Z');

    const res = await list(room);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      messages: [
        {
          id: second,
          senderId: shop,
          message: 'Còn hàng',
          createdAt: '2026-09-02T01:00:00.000Z',
        },
        {
          id: first,
          senderId: me,
          message: 'Chào anh',
          createdAt: '2026-09-02T00:00:00.000Z',
        },
      ],
      nextCursor: null,
    });
  });

  it('pages older messages with nextCursor', async () => {
    const ids: string[] = [];
    for (let hour = 0; hour < 5; hour++) {
      ids.push(
        await insertMessage(
          room,
          hour % 2 ? shop : me,
          `msg ${hour}`,
          `2026-09-02T0${hour}:00:00Z`,
        ),
      );
    }
    // Same createdAt as the newest one: order falls back to id.
    ids.push(await insertMessage(room, shop, 'tie', '2026-09-02T04:00:00Z'));

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await list(
        room,
        cursor ? { limit: 2, cursor } : { limit: 2 },
      );
      expect(res.status).toBe(200);
      seen.push(...res.body.messages.map((m: { id: string }) => m.id));
      cursor = res.body.nextCursor;
    } while (cursor);

    expect(seen).toHaveLength(6);
    expect(new Set(seen)).toEqual(new Set(ids));
    expect(seen.slice(2)).toEqual([ids[3], ids[2], ids[1], ids[0]]);
  });

  it('returns an empty page for a room without messages', async () => {
    const res = await list(room);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ messages: [], nextCursor: null });
  });

  it('rejects a caller who is not a member of the room', async () => {
    const res = await list(otherRoom);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CHAT_NOT_ROOM_MEMBER');
  });

  it('rejects an unknown room', async () => {
    const res = await list('00000000-0000-4000-8000-0000000000ff');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('CHAT_ROOM_NOT_FOUND');
  });

  it('rejects a malformed cursor', async () => {
    const res = await list(room, { cursor: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CHAT_INVALID_CURSOR');
  });

  it.each([
    ['a non-uuid room id', 'not-a-uuid', {}],
    ['limit above 50', room, { limit: 51 }],
    ['limit below 1', room, { limit: 0 }],
    ['an unknown query field', room, { foo: 'bar' }],
  ])('rejects %s', async (_case, roomId, query) => {
    const res = await list(roomId, query);

    expect(res.status).toBe(400);
  });

  it('rejects a request without an access token', async () => {
    const res = await list(room, {}, null);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
