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

describe('DELETE /products/:productId (e2e)', () => {
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

  const remove = (productId: string, token: string | null) => {
    const req = http().delete(`/products/${productId}`);
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send();
  };

  it('soft-deletes the product and removes its media rows and files', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId, media } = await createProduct(seller);
    const other = await createProduct(seller);

    await remove(productId, seller.token).expect(200);

    const [row] = await dataSource.query(
      'SELECT status, deleted_at FROM products WHERE id = $1',
      [productId],
    );
    expect(row.status).toBe('ACTIVE');
    expect(row.deleted_at).toBeInstanceOf(Date);
    expect(
      await dataSource.query('SELECT id FROM media WHERE owner_id = $1', [
        productId,
      ]),
    ).toEqual([]);
    expect(storage.files.has(media.source)).toBe(false);
    expect(storage.files.has(other.media.source)).toBe(true);
  });

  it('treats a deleted product as missing (404 on delete and update)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);
    const { productId } = await createProduct(seller);
    await remove(productId, seller.token).expect(200);

    const again = await remove(productId, seller.token).expect(404);
    expect(again.body.code).toBe('PRODUCT_NOT_FOUND');

    const patch = await http()
      .patch(`/products/${productId}`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ name: 'X' })
      .expect(404);
    expect(patch.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects a request without access token (401)', async () => {
    const res = await remove(unknownId, null).expect(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('rejects a farmer (403)', async () => {
    const user = await signUp(farmer);

    const res = await remove(unknownId, user.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_SELLER_NOT_ALLOWED');
  });

  it('rejects an unknown product (404)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    const res = await remove(unknownId, seller.token).expect(404);

    expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects a product of another distributor (403)', async () => {
    const owner = await signUp(distributor('0912 345 678'), true);
    const { productId, media } = await createProduct(owner);
    const other = await signUp(distributor('0987 654 321'), true);

    const res = await remove(productId, other.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_NOT_OWNER');
    const [row] = await dataSource.query(
      'SELECT deleted_at FROM products WHERE id = $1',
      [productId],
    );
    expect(row.deleted_at).toBeNull();
    expect(storage.files.has(media.source)).toBe(true);
  });

  it('rejects a product id that is not a uuid (400)', async () => {
    const seller = await signUp(distributor('0912 345 678'), true);

    await remove('abc', seller.token).expect(400);
  });
});
