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

describe('POST /reviews (e2e)', () => {
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
  const insertProduct = async (
    sellerId: string,
    status = 'ACTIVE',
    deleted = false,
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO products (id, user_id, name, description, price, quantity, unit, category_id, status, created_at, deleted_at)
       VALUES (gen_random_uuid(), $1, 'Lúa giống OM18', 'Bao 10kg', 250000, 40, 'bag', $2, $3, now(), $4)
       RETURNING id`,
      [sellerId, categoryId, status, deleted ? new Date() : null],
    );
    return id;
  };

  const review = (user: TUser | null, body: object) => {
    const req = http().post('/reviews');
    if (user) {
      req.set('Authorization', `Bearer ${user.token}`);
    }
    return req.send(body);
  };

  const body = (targetType: string, targetId: string, extra: object = {}) => ({
    targetType,
    targetId,
    content: '  Hạt giống tốt, nảy mầm đều  ',
    star: 5,
    ...extra,
  });

  it('reviews a distributor and notifies it', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    const res = await review(farmer, body('USER', shop.id)).expect(201);

    expect(res.body).toEqual({ reviewId: expect.any(String) });
    const rows = await dataSource.query('SELECT * FROM reviews');
    expect(rows).toEqual([
      expect.objectContaining({
        id: res.body.reviewId,
        user_id: farmer.id,
        target_type: 'USER',
        target_id: shop.id,
        content: 'Hạt giống tốt, nảy mầm đều',
        star: 5,
      }),
    ]);
    const notifications = await dataSource.query(
      'SELECT user_id, type, label, content, reference_id, is_read FROM notifications',
    );
    expect(notifications).toEqual([
      {
        user_id: shop.id,
        type: 'REVIEW',
        label: 'Đánh giá mới',
        content: 'Bạn nhận được đánh giá 5 sao',
        reference_id: res.body.reviewId,
        is_read: false,
      },
    ]);
  });

  it('reviews a product and notifies its seller', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const productId = await insertProduct(shop.id);

    const res = await review(
      farmer,
      body('PRODUCT', productId, { star: 3 }),
    ).expect(201);

    const [notification] = await dataSource.query(
      'SELECT user_id, content, reference_id FROM notifications',
    );
    expect(notification).toEqual({
      user_id: shop.id,
      content: 'Bạn nhận được đánh giá 3 sao',
      reference_id: res.body.reviewId,
    });
  });

  it('shows the notification in the distributor list', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const res = await review(farmer, body('USER', shop.id)).expect(201);

    const list = await http()
      .get('/notifications')
      .set('Authorization', `Bearer ${shop.token}`)
      .expect(200);

    expect(list.body.notifications).toEqual([
      expect.objectContaining({
        type: 'REVIEW',
        referenceId: res.body.reviewId,
      }),
    ]);
  });

  it('rejects a second review of the same target', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    await review(farmer, body('USER', shop.id)).expect(201);

    const res = await review(farmer, body('USER', shop.id)).expect(409);

    expect(res.body.code).toBe('REVIEW_ALREADY_EXISTS');
    expect(await dataSource.query('SELECT id FROM reviews')).toHaveLength(1);
  });

  it('rejects a DISTRIBUTOR as reviewer', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const other = await signUp(distributorAccount('0987654321'));

    const res = await review(other, body('USER', shop.id)).expect(403);

    expect(res.body.code).toBe('REVIEW_REVIEWER_NOT_ALLOWED');
  });

  it('rejects an inactive FARMER as reviewer', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'), false);
    await dataSource.query(
      `UPDATE users SET status = 'PENDING' WHERE id = $1`,
      [farmer.id],
    );

    const res = await review(farmer, body('USER', shop.id)).expect(403);

    expect(res.body.code).toBe('REVIEW_REVIEWER_NOT_ALLOWED');
  });

  it.each([
    ['USER', 'an unknown user'],
    ['PRODUCT', 'an unknown product'],
  ])(
    'returns 404 for %s target that does not exist (%s)',
    async (targetType) => {
      const farmer = await signUp(farmerAccount('farmer@mail.com'));

      const res = await review(farmer, body(targetType, unknownId)).expect(404);

      expect(res.body.code).toBe('REVIEW_TARGET_NOT_FOUND');
    },
  );

  it('returns 404 for a deleted product', async () => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const productId = await insertProduct(shop.id, 'ACTIVE', true);

    const res = await review(farmer, body('PRODUCT', productId)).expect(404);

    expect(res.body.code).toBe('REVIEW_TARGET_NOT_FOUND');
  });

  it('returns 422 for a FARMER as target user', async () => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));
    const otherFarmer = await signUp(farmerAccount('other@mail.com'));

    const res = await review(farmer, body('USER', otherFarmer.id)).expect(422);

    expect(res.body.code).toBe('REVIEW_INVALID_TARGET');
  });

  it('returns 422 for a PENDING distributor', async () => {
    const shop = await signUp(distributorAccount('0912345678'), false);
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    const res = await review(farmer, body('USER', shop.id)).expect(422);

    expect(res.body.code).toBe('REVIEW_INVALID_TARGET');
  });

  it.each(['INACTIVE', 'OUT_OF_STOCK'])(
    'returns 422 for a %s product',
    async (status) => {
      const shop = await signUp(distributorAccount('0912345678'));
      const farmer = await signUp(farmerAccount('farmer@mail.com'));
      const productId = await insertProduct(shop.id, status);

      const res = await review(farmer, body('PRODUCT', productId)).expect(422);

      expect(res.body.code).toBe('REVIEW_INVALID_TARGET');
    },
  );

  it.each([
    [0, 'REVIEW_INVALID_STAR'],
    [6, 'REVIEW_INVALID_STAR'],
  ])('rejects star %p', async (star, code) => {
    const shop = await signUp(distributorAccount('0912345678'));
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    const res = await review(farmer, body('USER', shop.id, { star })).expect(
      400,
    );

    expect(res.body.code).toBe(code);
  });

  it.each(['   ', 'a'.repeat(1001)])(
    'rejects content of length %#',
    async (content) => {
      const shop = await signUp(distributorAccount('0912345678'));
      const farmer = await signUp(farmerAccount('farmer@mail.com'));

      const res = await review(
        farmer,
        body('USER', shop.id, { content }),
      ).expect(400);

      expect(res.body.code).toBe('REVIEW_INVALID_CONTENT');
    },
  );

  it.each([
    { targetType: 'SHOP' },
    { targetId: 'not-a-uuid' },
    { star: 4.5 },
    { star: '5' },
    { content: 5 },
    { extra: true },
  ])('rejects invalid body %p', async (patch) => {
    const farmer = await signUp(farmerAccount('farmer@mail.com'));

    await review(farmer, { ...body('USER', unknownId), ...patch }).expect(400);
    expect(await dataSource.query('SELECT id FROM reviews')).toHaveLength(0);
  });

  it('requires an access token', async () => {
    const res = await review(null, body('USER', unknownId)).expect(401);

    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });
});
