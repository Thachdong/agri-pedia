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

describe('PATCH /products/:productId (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storage: InMemoryFileStorage;
  let categoryId: string;
  let otherCategoryId: string;

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
    [{ id: otherCategoryId }] = await dataSource.query(
      `SELECT id FROM categories WHERE name = 'Giống thủy sản'`,
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

  const update = (productId: string, body: object, token: string | null) => {
    const req = http().patch(`/products/${productId}`);
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(body);
  };

  it('updates the given fields and keeps the others', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId } = await createProduct(seller);

    await update(
      productId,
      {
        name: ' Lúa giống OM5451 ',
        price: 300000.25,
        categoryId: otherCategoryId,
        status: 'OUT_OF_STOCK',
      },
      seller.token,
    ).expect(200);

    const [row] = await dataSource.query(
      'SELECT name, description, price, quantity, unit, category_id, status FROM products WHERE id = $1',
      [productId],
    );
    expect(row).toEqual({
      name: 'Lúa giống OM5451',
      description: 'Bao 10kg, nảy mầm 95%',
      price: '300000.25',
      quantity: 40,
      unit: 'bag',
      category_id: otherCategoryId,
      status: 'OUT_OF_STOCK',
    });
  });

  it('removes media (row + storage object) and attaches new TMP media', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId, media: old } = await createProduct(seller);
    storage.files.add(tmpKey(seller.id, 2, 'mp4'));

    await update(
      productId,
      {
        removeMediaIds: [old.id],
        addMedia: [
          {
            key: tmpKey(seller.id, 2, 'mp4'),
            type: 'VIDEO',
            extension: 'mp4',
            filename: 'field.mp4',
            sortOrder: 1,
          },
        ],
      },
      seller.token,
    ).expect(200);

    const media = await dataSource.query(
      'SELECT id, source, owner_id, filename, sort_order FROM media',
    );
    expect(media).toEqual([
      {
        id: expect.any(String),
        source: `products/${productId}/${media[0].id}.mp4`,
        owner_id: productId,
        filename: 'field.mp4',
        sort_order: 1,
      },
    ]);
    expect([...storage.files]).toEqual([media[0].source]);
  });

  it('ignores removeMediaIds of another product', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const first = await createProduct(seller);
    const second = await createProduct(seller);

    await update(
      first.productId,
      { removeMediaIds: [second.media.id] },
      seller.token,
    ).expect(200);

    expect(
      await dataSource.query('SELECT id FROM media WHERE id = $1', [
        second.media.id,
      ]),
    ).toHaveLength(1);
    expect(storage.files.has(second.media.source)).toBe(true);
  });

  it('rejects a request without access token (401)', async () => {
    const res = await update(unknownId, { name: 'X' }, null).expect(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('rejects a farmer (403)', async () => {
    const user = await signUp(farmer);

    const res = await update(unknownId, { name: 'X' }, user.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_SELLER_NOT_ALLOWED');
  });

  it('rejects an unknown product (404)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    const res = await update(unknownId, { name: 'X' }, seller.token).expect(
      404,
    );

    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects a product of another distributor (403)', async () => {
    const owner = await signUp(distributor('0912 345 678'), true);
    const { productId, media } = await createProduct(owner);
    const other = await signUp(distributor('0987 654 321'), true);

    const res = await update(
      productId,
      { name: 'Hijacked', removeMediaIds: [media.id] },
      other.token,
    ).expect(403);

    expect(res.body.code).toBe('PRODUCT_NOT_OWNER');
    const [row] = await dataSource.query(
      'SELECT name FROM products WHERE id = $1',
      [productId],
    );
    expect(row.name).toBe('Lúa giống OM18');
    expect(await dataSource.query('SELECT id FROM media')).toHaveLength(1);
  });

  it('rejects an unknown category (404)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId } = await createProduct(seller);

    const res = await update(
      productId,
      { categoryId: unknownId },
      seller.token,
    ).expect(404);

    expect(res.body.code).toBe('PRODUCT_CATEGORY_NOT_FOUND');
  });

  it.each([
    ['negative price', { price: -1 }, 'PRODUCT_INVALID_PRICE'],
    ['fractional quantity', { quantity: 1.5 }, 'PRODUCT_INVALID_QUANTITY'],
  ])('rejects %s (400)', async (_, body, code) => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId } = await createProduct(seller);

    const res = await update(productId, body, seller.token).expect(400);

    expect(res.body.code).toBe(code);
  });

  it('rejects a product id that is not a uuid (400)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    await update('abc', { name: 'X' }, seller.token).expect(400);
  });

  it.each([
    ['null name', { name: null }],
    ['empty name', { name: '' }],
    ['unknown status', { status: 'SOLD' }],
    ['unknown unit', { unit: 'box' }],
    ['media id not a uuid', { removeMediaIds: ['abc'] }],
    [
      'media item without key',
      { addMedia: [{ type: 'IMAGE', extension: 'png', filename: 'a.png' }] },
    ],
    ['unknown field', { color: 'red' }],
  ])('rejects %s (400 validation)', async (_, body) => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId } = await createProduct(seller);

    await update(productId, body, seller.token).expect(400);
    const [row] = await dataSource.query(
      'SELECT name, status FROM products WHERE id = $1',
      [productId],
    );
    expect(row).toEqual({ name: 'Lúa giống OM18', status: 'ACTIVE' });
  });
});
