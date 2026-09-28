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
const someoneElse = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';
const reviewId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];

describe('GET /notifications (e2e)', () => {
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
    await dataSource.query('DELETE FROM notifications');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  // No API creates notifications for a user yet (review event pending): seed rows directly.
  const insert = (
    id: string,
    userId: string,
    createdAt: string,
    isRead = false,
    referenceId: string | null = reviewId,
  ) =>
    dataSource.query(
      `INSERT INTO notifications (id, user_id, type, label, content, reference_id, is_read, created_at)
       VALUES ($1, $2, 'REVIEW', 'Đánh giá mới', 'Bạn nhận được đánh giá 5 sao', $3, $4, $5)`,
      [id, userId, referenceId, isRead, createdAt],
    );

  const list = (query: Record<string, string | number> = {}) =>
    http()
      .get('/notifications')
      .query(query)
      .set('Authorization', `Bearer ${token}`);

  it('returns only my notifications, read and unread, newest first', async () => {
    await insert(ids[0], me, '2026-09-01T00:00:00.000Z', true, null);
    await insert(ids[1], me, '2026-09-02T00:00:00.000Z');
    await insert(ids[2], someoneElse, '2026-09-03T00:00:00.000Z');

    const res = await list().expect(200);

    expect(res.body).toEqual({
      notifications: [
        {
          id: ids[1],
          type: 'REVIEW',
          label: 'Đánh giá mới',
          content: 'Bạn nhận được đánh giá 5 sao',
          isRead: false,
          referenceId: reviewId,
          createdAt: '2026-09-02T00:00:00.000Z',
        },
        expect.objectContaining({
          id: ids[0],
          isRead: true,
          referenceId: null,
        }),
      ],
      nextCursor: null,
    });
  });

  it('pages with nextCursor', async () => {
    await insert(ids[0], me, '2026-09-01T00:00:00.000Z');
    await insert(ids[1], me, '2026-09-02T00:00:00.000Z');
    await insert(ids[2], me, '2026-09-02T00:00:00.000Z');

    const first = await list({ limit: 2 }).expect(200);
    expect(first.body.notifications.map((n: { id: string }) => n.id)).toEqual([
      ids[2],
      ids[1],
    ]);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await list({
      limit: 2,
      cursor: first.body.nextCursor,
    }).expect(200);
    expect(second.body).toEqual({
      notifications: [expect.objectContaining({ id: ids[0] })],
      nextCursor: null,
    });
  });

  it('returns an empty list when I have no notifications', async () => {
    await list().expect(200, { notifications: [], nextCursor: null });
  });

  it('rejects a malformed cursor', async () => {
    const res = await list({ cursor: 'garbage' }).expect(400);

    expect(res.body.code).toBe('NOTIFICATION_INVALID_CURSOR');
  });

  it.each([0, 51, 'abc'])('rejects limit %p', async (limit) => {
    await list({ limit }).expect(400);
  });

  it('rejects an unknown query field', async () => {
    await list({ userId: someoneElse }).expect(400);
  });

  it('requires an access token', async () => {
    const res = await http().get('/notifications').expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
