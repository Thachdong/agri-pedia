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

const shopAccount = {
  loginType: 'PHONE',
  identifier: '0912345678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

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

describe('GET /reviews/products/:productId (e2e)', () => {
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
    deleted = false,
  ): Promise<string> => {
    const [{ id }] = await dataSource.query(
      `INSERT INTO products (id, user_id, name, description, price, quantity, unit, category_id, status, created_at, deleted_at)
       VALUES (gen_random_uuid(), $1, 'Lúa OM18', 'd', 1000, 1, 'bag', $2, 'ACTIVE', now(), $3)
       RETURNING id`,
      [sellerId, categoryId, deleted ? new Date() : null],
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

  const list = (
    productId: string,
    query: Record<string, string | number> = {},
  ) => http().get(`/reviews/products/${productId}`).query(query);

  it('lists only the reviews of the product, newest first, with reviewer, without login', async () => {
    const shop = await signUp(shopAccount);
    const farmerA = await signUp(farmerAccount('a@mail.com', 'Farmer A'));
    const farmerB = await signUp(farmerAccount('b@mail.com', 'Farmer B'));
    await insertAvatar(farmerA);
    const product = await insertProduct(shop);
    const otherProduct = await insertProduct(shop);
    const older = await insertReview(farmerA, 'PRODUCT', product, 5, 2);
    const newer = await insertReview(farmerB, 'PRODUCT', product, 3, 1);
    await insertReview(farmerA, 'PRODUCT', otherProduct, 4, 0);
    await insertReview(farmerB, 'USER', shop, 1, 0);

    const res = await list(product).expect(200);

    expect(res.body).toEqual({
      reviews: [
        {
          id: newer,
          star: 3,
          content: 'r-1',
          createdAt: expect.any(String),
          user: { id: farmerB, username: 'Farmer B', avatar: null },
        },
        {
          id: older,
          star: 5,
          content: 'r-2',
          createdAt: expect.any(String),
          user: {
            id: farmerA,
            username: 'Farmer A',
            avatar: `https://storage.test/users/${farmerA}/avatar.png?signed=read`,
          },
        },
      ],
      nextCursor: null,
    });
  });

  it('filters by star and pages with nextCursor', async () => {
    const shop = await signUp(shopAccount);
    const farmers = [
      await signUp(farmerAccount('a@mail.com', 'A')),
      await signUp(farmerAccount('b@mail.com', 'B')),
      await signUp(farmerAccount('c@mail.com', 'C')),
    ];
    const product = await insertProduct(shop);
    const ids = [
      await insertReview(farmers[0], 'PRODUCT', product, 5, 1),
      await insertReview(farmers[1], 'PRODUCT', product, 5, 2),
      await insertReview(farmers[2], 'PRODUCT', product, 2, 3),
    ];

    const first = await list(product, { star: 5, limit: 1 }).expect(200);
    const second = await list(product, {
      star: 5,
      limit: 1,
      cursor: first.body.nextCursor,
    }).expect(200);

    expect(first.body.reviews.map((r: { id: string }) => r.id)).toEqual([
      ids[0],
    ]);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    expect(second.body.reviews.map((r: { id: string }) => r.id)).toEqual([
      ids[1],
    ]);
    expect(second.body.nextCursor).toBeNull();
  });

  it('404 REVIEW_TARGET_NOT_FOUND for a deleted or unknown product', async () => {
    const shop = await signUp(shopAccount);
    const deleted = await insertProduct(shop, true);

    for (const id of [deleted, unknownId]) {
      const res = await list(id).expect(404);
      expect(res.body.code).toBe('REVIEW_TARGET_NOT_FOUND');
    }
  });

  it('400 REVIEW_INVALID_CURSOR for a malformed cursor', async () => {
    const product = await insertProduct(await signUp(shopAccount));

    const res = await list(product, { cursor: 'nope' }).expect(400);

    expect(res.body.code).toBe('REVIEW_INVALID_CURSOR');
  });

  it('400 for a productId that is not a uuid or an invalid query', async () => {
    await list('not-a-uuid').expect(400);
    await list(unknownId, { star: 6 }).expect(400);
    await list(unknownId, { limit: 51 }).expect(400);
  });
});
