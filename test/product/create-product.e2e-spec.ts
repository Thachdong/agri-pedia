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
  province: 'Can Tho',
  ward: 'Ninh Kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
  isPrimary: true,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912 345 678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

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

describe('POST /products (e2e)', () => {
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

  const product = (userId: string, overrides: object = {}) => ({
    name: 'Lúa giống OM18',
    description: 'Bao 10kg, nảy mầm 95%',
    price: 250000.5,
    categoryId,
    quantity: 40,
    unit: 'bag',
    media: [
      {
        key: tmpKey(userId, 1, 'png'),
        type: 'IMAGE',
        extension: 'png',
        filename: 'front.png',
        sortOrder: 0,
      },
    ],
    ...overrides,
  });

  const create = (body: object, token: string | null) => {
    const req = http().post('/products');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(body);
  };

  it('creates an ACTIVE product and moves its media out of TMP', async () => {
    const seller = await signUp(distributor, true);
    storage.files.add(tmpKey(seller.id, 1, 'png'));

    const res = await create(product(seller.id), seller.token).expect(201);

    const { productId } = res.body;
    expect(productId).toMatch(/^[0-9a-f-]{36}$/);
    const [row] = await dataSource.query(
      'SELECT user_id, name, price, quantity, unit, category_id, status FROM products WHERE id = $1',
      [productId],
    );
    expect(row).toEqual({
      user_id: seller.id,
      name: 'Lúa giống OM18',
      price: '250000.50',
      quantity: 40,
      unit: 'bag',
      category_id: categoryId,
      status: 'ACTIVE',
    });
    const media = await dataSource.query(
      'SELECT id, source, owner_type, owner_id, filename, sort_order FROM media',
    );
    expect(media).toEqual([
      {
        id: expect.any(String),
        source: `products/${productId}/${media[0].id}.png`,
        owner_type: 'PRODUCT',
        owner_id: productId,
        filename: 'front.png',
        sort_order: 0,
      },
    ]);
    expect([...storage.files]).toEqual([media[0].source]);
  });

  it('still creates the product when a media file is missing in TMP', async () => {
    const seller = await signUp(distributor, true);

    const res = await create(product(seller.id), seller.token).expect(201);

    expect(
      await dataSource.query('SELECT id FROM products WHERE id = $1', [
        res.body.productId,
      ]),
    ).toHaveLength(1);
    expect(await dataSource.query('SELECT id FROM media')).toEqual([]);
  });

  it('rejects a request without access token (401)', async () => {
    const res = await create(product('u1'), null).expect(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('rejects a farmer (403)', async () => {
    const user = await signUp(farmer);

    const res = await create(product(user.id), user.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_SELLER_NOT_ALLOWED');
  });

  it('rejects a distributor not activated yet (403)', async () => {
    const seller = await signUp(distributor);

    const res = await create(product(seller.id), seller.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_SELLER_NOT_ALLOWED');
    expect(await dataSource.query('SELECT id FROM products')).toEqual([]);
  });

  it('rejects an unknown category (404)', async () => {
    const seller = await signUp(distributor, true);

    const res = await create(
      product(seller.id, {
        categoryId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
      }),
      seller.token,
    ).expect(404);

    expect(res.body.code).toBe('PRODUCT_CATEGORY_NOT_FOUND');
  });

  it.each([
    ['negative price', { price: -1 }, 'PRODUCT_INVALID_PRICE'],
    ['fractional quantity', { quantity: 1.5 }, 'PRODUCT_INVALID_QUANTITY'],
  ])('rejects %s (400)', async (_, overrides, code) => {
    const seller = await signUp(distributor, true);

    const res = await create(
      product(seller.id, overrides),
      seller.token,
    ).expect(400);

    expect(res.body.code).toBe(code);
  });

  it.each([
    ['no media', { media: [] }],
    ['unknown unit', { unit: 'box' }],
    ['category id not a uuid', { categoryId: 'abc' }],
    ['price with 3 decimals', { price: 1.123 }],
    ['unknown field', { color: 'red' }],
  ])('rejects %s (400 validation)', async (_, overrides) => {
    const seller = await signUp(distributor, true);

    await create(product(seller.id, overrides), seller.token).expect(400);
    expect(await dataSource.query('SELECT id FROM products')).toEqual([]);
  });
});

describe('GET /categories (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the seeded categories ordered by name, without login', async () => {
    const res = await request(app.getHttpServer())
      .get('/categories')
      .expect(200);

    expect(res.body.items.map((c: { name: string }) => c.name)).toEqual([
      'Giống cây trồng',
      'Giống thủy sản',
      'Thuốc & vật tư nông nghiệp',
    ]);
    res.body.items.forEach((c: { id: string }) =>
      expect(c.id).toMatch(/^[0-9a-f-]{36}$/),
    );
  });
});
