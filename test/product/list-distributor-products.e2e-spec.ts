import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
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

const distributor = (identifier: string) => ({
  loginType: 'PHONE',
  identifier,
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
});

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address,
};

const tmpKey = (userId: string, n: number, ext: string) =>
  `tmp/${userId}/00000000-0000-4000-8000-00000000000${n}.${ext}`;

const unknownId = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';

describe('GET /products (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storage: InMemoryFileStorage;
  let categoryId: string;

  beforeAll(async () => {
    storage = new InMemoryFileStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_STORAGE)
      .useValue(storage)
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
    storage.files.clear();
    await dataSource.query('DELETE FROM media');
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
  const signUp = async (body: object, activate = false) => {
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
    return { id: id as string, token };
  };

  /** Creates a product with one confirmed image; returns its id and the image media row. */
  const createProduct = async (seller: { id: string; token: string }) => {
    storage.files.add(tmpKey(seller.id, 1, 'png'));
    const res = await http()
      .post('/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({
        name: 'Lúa giống OM18',
        description: 'Bao 10kg, nảy mầm 95%',
        price: 250000,
        categoryId,
        quantity: 40,
        unit: 'bag',
        media: [
          {
            key: tmpKey(seller.id, 1, 'png'),
            type: 'IMAGE',
            extension: 'png',
            filename: 'front.png',
            sortOrder: 0,
          },
        ],
      })
      .expect(201);
    const productId: string = res.body.productId;
    const [media] = await dataSource.query(
      'SELECT id, source FROM media WHERE owner_id = $1',
      [productId],
    );
    return { productId, media: media as { id: string; source: string } };
  };

  /** Pins created_at so the order does not depend on request timing. */
  const setCreatedAt = (productId: string, iso: string) =>
    dataSource.query('UPDATE products SET created_at = $2 WHERE id = $1', [
      productId,
      iso,
    ]);

  const list = (query: Record<string, string | number>) =>
    http().get('/products').query(query);

  it('lists ACTIVE products newest first with thumbnail and distributor, without login', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const older = await createProduct(seller);
    const newer = await createProduct(seller);
    await setCreatedAt(older.productId, '2026-01-01T10:00:00.000Z');
    await setCreatedAt(newer.productId, '2026-01-01T11:00:00.000Z');

    const res = await list({ distributorId: seller.id }).expect(200);

    expect(res.body).toEqual({
      products: [
        {
          id: newer.productId,
          name: 'Lúa giống OM18',
          price: 250000,
          quantity: 40,
          unit: 'bag',
          thumbnail: `https://storage.test/${newer.media.source}?signed=read`,
          distributorId: seller.id,
          distributorName: 'Seed Shop',
        },
        expect.objectContaining({
          id: older.productId,
          thumbnail: `https://storage.test/${older.media.source}?signed=read`,
        }),
      ],
      nextCursor: null,
    });
  });

  it('hides INACTIVE, OUT_OF_STOCK and deleted products; thumbnail null without image', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const visible = await createProduct(seller);
    const inactive = await createProduct(seller);
    const outOfStock = await createProduct(seller);
    const deleted = await createProduct(seller);
    await dataSource.query(
      `UPDATE products SET status = 'INACTIVE' WHERE id = $1`,
      [inactive.productId],
    );
    await dataSource.query(
      `UPDATE products SET status = 'OUT_OF_STOCK' WHERE id = $1`,
      [outOfStock.productId],
    );
    await dataSource.query(
      'UPDATE products SET deleted_at = now() WHERE id = $1',
      [deleted.productId],
    );
    await dataSource.query('DELETE FROM media WHERE owner_id = $1', [
      visible.productId,
    ]);

    const res = await list({ distributorId: seller.id }).expect(200);

    expect(res.body.products).toEqual([
      expect.objectContaining({ id: visible.productId, thumbnail: null }),
    ]);
  });

  it('pages through products with nextCursor', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { productId } = await createProduct(seller);
      // Two products share a timestamp: order falls back to id.
      await setCreatedAt(productId, `2026-01-01T1${Math.min(i, 3)}:00:00.000Z`);
      ids.push(productId);
    }
    const expected = (
      await dataSource.query(
        `SELECT id FROM products ORDER BY created_at DESC, id DESC`,
      )
    ).map((row: { id: string }) => row.id);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await list({
        distributorId: seller.id,
        limit: 2,
        ...(cursor ? { cursor } : {}),
      }).expect(200);
      seen.push(...res.body.products.map((p: { id: string }) => p.id));
      cursor = res.body.nextCursor;
      pages++;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toEqual(expected);
    expect([...seen].sort()).toEqual([...ids].sort());
  });

  it('returns an empty page for a distributor without products', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    await list({ distributorId: seller.id })
      .expect(200)
      .expect({ products: [], nextCursor: null });
  });

  it('rejects an unknown distributor (404)', async () => {
    const res = await list({ distributorId: unknownId }).expect(404);
    expect(res.body.code).toBe('PRODUCT_DISTRIBUTOR_NOT_FOUND');
  });

  it('rejects a farmer id (404)', async () => {
    const user = await signUp(farmer);

    const res = await list({ distributorId: user.id }).expect(404);

    expect(res.body.code).toBe('PRODUCT_DISTRIBUTOR_NOT_FOUND');
  });

  it('rejects a malformed cursor (400)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    const res = await list({ distributorId: seller.id, cursor: 'abc' }).expect(
      400,
    );

    expect(res.body.code).toBe('PRODUCT_INVALID_CURSOR');
  });

  it.each([
    ['missing distributorId', {}],
    ['distributorId not a uuid', { distributorId: 'abc' }],
    ['limit 0', { distributorId: unknownId, limit: 0 }],
    ['limit 51', { distributorId: unknownId, limit: 51 }],
    ['limit not a number', { distributorId: unknownId, limit: 'ten' }],
    ['unknown param', { distributorId: unknownId, sort: 'price' }],
  ])('rejects %s (400 validation)', async (_, query) => {
    await list(query).expect(400);
  });
});
