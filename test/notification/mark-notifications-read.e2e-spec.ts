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

const ids = [
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
];

describe('PATCH /notifications/:id/read, /notifications/read-all (e2e)', () => {
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
  const insert = (id: string, userId: string, isRead = false) =>
    dataSource.query(
      `INSERT INTO notifications (id, user_id, type, label, content, reference_id, is_read, created_at)
       VALUES ($1, $2, 'REVIEW', 'Đánh giá mới', 'Bạn nhận được đánh giá 5 sao', NULL, $3, date_trunc('milliseconds', now()))`,
      [id, userId, isRead],
    );

  const isRead = async (id: string): Promise<boolean> => {
    const [row] = await dataSource.query(
      'SELECT is_read FROM notifications WHERE id = $1',
      [id],
    );
    return row.is_read;
  };

  const patch = (path: string) =>
    http().patch(path).set('Authorization', `Bearer ${token}`);

  describe('PATCH /notifications/:id/read', () => {
    it('marks my notification as read and leaves the others unread', async () => {
      await insert(ids[0], me);
      await insert(ids[1], me);

      await patch(`/notifications/${ids[0]}/read`).expect(200, '');

      expect(await isRead(ids[0])).toBe(true);
      expect(await isRead(ids[1])).toBe(false);
    });

    it('accepts a notification that is already read', async () => {
      await insert(ids[0], me, true);

      await patch(`/notifications/${ids[0]}/read`).expect(200, '');

      expect(await isRead(ids[0])).toBe(true);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await patch(`/notifications/${ids[0]}/read`).expect(404);

      expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it("returns 404 for someone else's notification and leaves it unread", async () => {
      await insert(ids[0], someoneElse);

      const res = await patch(`/notifications/${ids[0]}/read`).expect(404);

      expect(res.body.code).toBe('NOTIFICATION_NOT_FOUND');
      expect(await isRead(ids[0])).toBe(false);
    });

    it('rejects an id that is not a uuid', async () => {
      await patch('/notifications/not-a-uuid/read').expect(400);
    });

    it('requires an access token', async () => {
      const res = await http()
        .patch(`/notifications/${ids[0]}/read`)
        .expect(401);

      expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it("marks all my notifications as read, not other users'", async () => {
      await insert(ids[0], me);
      await insert(ids[1], me, true);
      await insert(ids[2], someoneElse);

      await patch('/notifications/read-all').expect(200, '');

      expect(await isRead(ids[0])).toBe(true);
      expect(await isRead(ids[1])).toBe(true);
      expect(await isRead(ids[2])).toBe(false);
    });

    it('succeeds when I have no notifications', async () => {
      await patch('/notifications/read-all').expect(200, '');
    });

    it('requires an access token', async () => {
      const res = await http().patch('/notifications/read-all').expect(401);

      expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    });
  });
});
