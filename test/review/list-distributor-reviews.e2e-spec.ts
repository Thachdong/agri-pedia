import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
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

const distributorAccount = (identifier: string, username: string) => ({
  loginType: 'PHONE',
  identifier,
  password: 'secret123',
  username,
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
});

const farmerAccount = (identifier: string, username: string) => ({
  loginType: 'EMAIL',
  identifier,
  password: 'secret123',
  username,
  role: 'FARMER',
  bussinessType: null,
  address,
});

const unknownId = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';

describe('GET /reviews (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_STORAGE)
      .useValue(new InMemoryFileStorage())
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    [{ id: categoryId }] = await dataSource.query(
      `SELECT id FROM categories WHERE name = 'Giống cây trồng'`,
    );
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM media');
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

  /** Registers the user; returns its id. */
  const signUp = async (body: object): Promise<string> => {
    await http().post('/auth/register').send(body).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    return id;
  };

  // Seeded directly: creating a product via the API needs uploaded media.
  const insertProduct = async (
    sellerId: string,
    name: string,
    props: { status?: string; deleted?: boolean } = {},
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO products (id, user_id, name, description, price, quantity, unit, category_id, status, created_at, deleted_at)
       VALUES (gen_random_uuid(), $1, $2, 'd', 1000, 1, 'bag', $3, $4, now(), $5)
       RETURNING id`,
      [
        sellerId,
        name,
        categoryId,
        props.status ?? 'ACTIVE',
        props.deleted ? new Date() : null,
      ],
    );
    return id;
  };

  // Seeded directly to control created_at (ms precision, like rows the app writes).
  const insertReview = async (
    userId: string,
    targetType: 'USER' | 'PRODUCT',
    targetId: string,
    star: number,
    minutesAgo: number,
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO reviews (id, user_id, target_type, target_id, content, star, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
               date_trunc('milliseconds', now()) - make_interval(mins => $6))
       RETURNING id`,
      [userId, targetType, targetId, `r-${minutesAgo}`, star, minutesAgo],
    );
    return id;
  };

  const insertAvatar = (userId: string) =>
    dataSource.query(
      `INSERT INTO media (id, type, extension, filename, source, owner_type, owner_id, sort_order)
       VALUES (gen_random_uuid(), 'IMAGE', 'png', 'me.png', $1, 'USER_AVATAR', $2, NULL)`,
      [`users/${userId}/avatar.png`, userId],
    );

  const list = (query: Record<string, string | number>) =>
    http().get('/reviews').query(query);

  it('lists shop and product reviews with summary, reviewer and product name (no login)', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));
    const otherShop = await signUp(
      distributorAccount('0987654321', 'Other Shop'),
    );
    const farmerA = await signUp(farmerAccount('a@mail.com', 'Farmer A'));
    const farmerB = await signUp(farmerAccount('b@mail.com', 'Farmer B'));
    await insertAvatar(farmerA);
    const rice = await insertProduct(shop, 'Lúa OM18');
    const gone = await insertProduct(shop, 'Phân NPK', { deleted: true });
    const paused = await insertProduct(shop, 'Tôm giống', {
      status: 'INACTIVE',
    });
    const foreign = await insertProduct(otherShop, 'Khác');

    const shopReview = await insertReview(farmerA, 'USER', shop, 5, 1);
    const riceReview = await insertReview(farmerB, 'PRODUCT', rice, 4, 2);
    await insertReview(farmerA, 'PRODUCT', gone, 2, 3);
    await insertReview(farmerB, 'PRODUCT', paused, 3, 4);
    await insertReview(farmerA, 'USER', otherShop, 1, 0);
    await insertReview(farmerA, 'PRODUCT', foreign, 1, 0);

    const res = await list({ distributorId: shop }).expect(200);

    expect(res.body.summary).toEqual({
      avgRating: 3.5,
      reviewCount: 4,
      starCounts: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 1 },
    });
    expect(
      res.body.reviews.map(
        (r: { productName: string | null }) => r.productName,
      ),
    ).toEqual([null, 'Lúa OM18', 'Phân NPK', 'Tôm giống']);
    expect(res.body.reviews[0]).toEqual({
      id: shopReview,
      targetType: 'USER',
      targetId: shop,
      productName: null,
      star: 5,
      content: 'r-1',
      createdAt: expect.any(String),
      user: {
        id: farmerA,
        username: 'Farmer A',
        avatar: `https://storage.test/users/${farmerA}/avatar.png?signed=read`,
      },
    });
    expect(res.body.reviews[1]).toMatchObject({
      id: riceReview,
      targetType: 'PRODUCT',
      targetId: rice,
      user: { id: farmerB, username: 'Farmer B', avatar: null },
    });
    expect(res.body.nextCursor).toBeNull();
  });

  it('filters by targetType and star without changing the summary', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));
    const farmer = await signUp(farmerAccount('a@mail.com', 'Farmer A'));
    const rice = await insertProduct(shop, 'Lúa OM18');
    await insertReview(farmer, 'USER', shop, 5, 1);
    await insertReview(farmer, 'PRODUCT', rice, 5, 2);

    const byType = await list({
      distributorId: shop,
      targetType: 'PRODUCT',
    }).expect(200);
    expect(
      byType.body.reviews.map((r: { targetId: string }) => r.targetId),
    ).toEqual([rice]);
    expect(byType.body.summary.reviewCount).toBe(2);

    const byStar = await list({ distributorId: shop, star: 4 }).expect(200);
    expect(byStar.body.reviews).toEqual([]);
    expect(byStar.body.summary.reviewCount).toBe(2);
  });

  it('pages with nextCursor', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));
    const farmer = await signUp(farmerAccount('a@mail.com', 'Farmer A'));
    const products = [
      await insertProduct(shop, 'P1'),
      await insertProduct(shop, 'P2'),
    ];
    await insertReview(farmer, 'USER', shop, 5, 1);
    await insertReview(farmer, 'PRODUCT', products[0], 4, 2);
    await insertReview(farmer, 'PRODUCT', products[1], 3, 3);

    const first = await list({ distributorId: shop, limit: 2 }).expect(200);
    expect(
      first.body.reviews.map((r: { content: string }) => r.content),
    ).toEqual(['r-1', 'r-2']);
    expect(first.body.nextCursor).toEqual(expect.any(String));

    const second = await list({
      distributorId: shop,
      limit: 2,
      cursor: first.body.nextCursor,
    }).expect(200);
    expect(
      second.body.reviews.map((r: { content: string }) => r.content),
    ).toEqual(['r-3']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('returns an empty list and zero summary for a shop without reviews', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));

    await list({ distributorId: shop }).expect(200, {
      summary: {
        avgRating: 0,
        reviewCount: 0,
        starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      reviews: [],
      nextCursor: null,
    });
  });

  it('shows reviews written through POST /reviews', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));
    const farmer = await signUp(farmerAccount('a@mail.com', 'Farmer A'));
    await dataSource.query(`UPDATE users SET status = 'ACTIVE'`);
    const token = await http()
      .post('/auth/login')
      .send({
        loginType: 'EMAIL',
        identifier: 'a@mail.com',
        password: 'secret123',
      })
      .expect(200);
    await http()
      .post('/reviews')
      .set('Authorization', `Bearer ${token.body.accessToken}`)
      .send({ targetType: 'USER', targetId: shop, content: 'Tốt', star: 4 })
      .expect(201);

    const res = await list({ distributorId: shop }).expect(200);

    expect(res.body.reviews).toEqual([
      expect.objectContaining({
        content: 'Tốt',
        star: 4,
        user: expect.objectContaining({ id: farmer, username: 'Farmer A' }),
      }),
    ]);
  });

  it.each([
    ['an unknown id', async () => unknownId],
    [
      'a FARMER',
      async (signUpFn: (body: object) => Promise<string>) =>
        signUpFn(farmerAccount('a@mail.com', 'Farmer A')),
    ],
  ])('returns 404 when distributorId is %s', async (_, idOf) => {
    const id = await idOf(signUp);

    const res = await list({ distributorId: id }).expect(404);

    expect(res.body.code).toBe('REVIEW_DISTRIBUTOR_NOT_FOUND');
  });

  it('rejects a malformed cursor', async () => {
    const shop = await signUp(distributorAccount('0912345678', 'Seed Shop'));

    const res = await list({ distributorId: shop, cursor: 'garbage' }).expect(
      400,
    );

    expect(res.body.code).toBe('REVIEW_INVALID_CURSOR');
  });

  it.each([
    {},
    { distributorId: 'not-a-uuid' },
    { distributorId: unknownId, targetType: 'SHOP' },
    { distributorId: unknownId, star: 0 },
    { distributorId: unknownId, star: 6 },
    { distributorId: unknownId, limit: 51 },
    { distributorId: unknownId, other: 1 },
  ])('rejects invalid query %p', async (query) => {
    await list(query).expect(400);
  });
});
