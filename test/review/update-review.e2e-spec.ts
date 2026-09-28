import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
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

describe('PATCH /reviews/:reviewId (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    [{ id: categoryId }] = await dataSource.query(
      `SELECT id FROM categories WHERE name = 'Giống cây trồng'`,
    );
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM notifications');
    await dataSource.query('DELETE FROM reviews');
    await dataSource.query('DELETE FROM products');
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object, activate = true): Promise<TUser> => {
    await http().post('/auth/register').send(body).expect(201);
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

  // Seeded directly: creating a product via the API needs uploaded media.
  const insertProduct = async (sellerId: string): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO products (id, user_id, name, description, price, quantity, unit, category_id, status, created_at)
       VALUES (gen_random_uuid(), $1, 'Lúa giống OM18', 'Bao 10kg', 250000, 40, 'bag', $2, 'ACTIVE', now())
       RETURNING id`,
      [sellerId, categoryId],
    );
    return id;
  };

  /** Creates a 5-star review via the API, then clears its notification. */
  const createReview = async (
    farmer: TUser,
    targetType: string,
    targetId: string,
  ): Promise<string> => {
    const res = await http()
      .post('/reviews')
      .set('Authorization', `Bearer ${farmer.token}`)
      .send({ targetType, targetId, content: 'Hạt giống tốt', star: 5 })
      .expect(201);
    await dataSource.query('DELETE FROM notifications');
    return res.body.reviewId;
  };

  const update = (user: TUser | null, reviewId: string, body: object) => {
    const req = http().patch(`/reviews/${reviewId}`);
    if (user) {
      req.set('Authorization', `Bearer ${user.token}`);
    }
    return req.send(body);
  };

  const reviewRow = async (id: string) => {
    const [row] = await dataSource.query(
      'SELECT content, star FROM reviews WHERE id = $1',
      [id],
    );
    return row;
  };

  it('updates a distributor review and notifies the distributor', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const reviewId = await createReview(farmer, 'USER', shop.id);

    const res = await update(farmer, reviewId, {
      content: '  Giao hàng hơi chậm  ',
      star: 3,
    }).expect(200);

    expect(res.body).toEqual({});
    expect(await reviewRow(reviewId)).toEqual({
      content: 'Giao hàng hơi chậm',
      star: 3,
    });
    const notifications = await dataSource.query(
      'SELECT user_id, type, label, content, reference_id, is_read FROM notifications',
    );
    expect(notifications).toEqual([
      {
        user_id: shop.id,
        type: 'REVIEW',
        label: 'Đánh giá được cập nhật',
        content: 'Một đánh giá đã được cập nhật thành 3 sao',
        reference_id: reviewId,
        is_read: false,
      },
    ]);
  });

  it('updates a product review and notifies its seller', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const productId = await insertProduct(shop.id);
    const reviewId = await createReview(farmer, 'PRODUCT', productId);

    await update(farmer, reviewId, { star: 2 }).expect(200);

    expect(await reviewRow(reviewId)).toEqual({
      content: 'Hạt giống tốt',
      star: 2,
    });
    const [notification] = await dataSource.query(
      'SELECT user_id, content, reference_id FROM notifications',
    );
    expect(notification).toEqual({
      user_id: shop.id,
      content: 'Một đánh giá đã được cập nhật thành 2 sao',
      reference_id: reviewId,
    });
  });

  it('keeps the review and sends nothing for an empty body', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const reviewId = await createReview(farmer, 'USER', shop.id);

    await update(farmer, reviewId, {}).expect(200);

    expect(await reviewRow(reviewId)).toEqual({
      content: 'Hạt giống tốt',
      star: 5,
    });
    expect(await dataSource.query('SELECT id FROM notifications')).toEqual([]);
  });

  it('rejects a review of another farmer', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const other = await signUp(farmerAccount('other@mail.com'));
    const reviewId = await createReview(farmer, 'USER', shop.id);

    const res = await update(other, reviewId, { star: 1 }).expect(403);

    expect(res.body.code).toBe('REVIEW_NOT_OWNER');
    expect((await reviewRow(reviewId)).star).toBe(5);
  });

  it('rejects a DISTRIBUTOR as caller', async () => {
    const shop = await signUp(distributorAccount('0912345678'));

    const res = await update(shop, unknownId, { star: 1 }).expect(403);

    expect(res.body.code).toBe('REVIEW_REVIEWER_NOT_ALLOWED');
  });

  it('returns 404 for an unknown review', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    const res = await update(farmer, unknownId, { star: 1 }).expect(404);

    expect(res.body.code).toBe('REVIEW_NOT_FOUND');
  });

  it.each([
    [{ star: 0 }, 'REVIEW_INVALID_STAR'],
    [{ star: 6 }, 'REVIEW_INVALID_STAR'],
    [{ content: '   ' }, 'REVIEW_INVALID_CONTENT'],
    [{ content: 'a'.repeat(1001) }, 'REVIEW_INVALID_CONTENT'],
  ])('rejects %p with %s', async (body, code) => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const reviewId = await createReview(farmer, 'USER', shop.id);

    const res = await update(farmer, reviewId, body).expect(400);

    expect(res.body.code).toBe(code);
  });

  it.each([
    { star: 4.5 },
    { star: '5' },
    { star: null },
    { content: 5 },
    { content: null },
    { extra: true },
  ])('rejects invalid body %p', async (body) => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const reviewId = await createReview(farmer, 'USER', shop.id);

    await update(farmer, reviewId, body).expect(400);
    expect(await reviewRow(reviewId)).toEqual({
      content: 'Hạt giống tốt',
      star: 5,
    });
  });

  it('rejects a reviewId that is not a uuid', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    await update(farmer, 'not-a-uuid', { star: 1 }).expect(400);
  });

  it('requires an access token', async () => {
    const res = await update(null, unknownId, { star: 1 }).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
