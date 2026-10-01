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

const distributor = {
  loginType: 'PHONE',
  identifier: '0912 345 678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

const tmpKey = (userId: string, n: number, ext: string) =>
  `tmp/${userId}/00000000-0000-4000-8000-00000000000${n}.${ext}`;

const unknownId = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';

describe('GET /products/:productId (e2e)', () => {
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

  /** Registers an ACTIVE distributor; returns its id and an access token for it. */
  const signUpSeller = async () => {
    await http().post('/auth/register').send(distributor).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    await dataSource.query(`UPDATE users SET status = 'ACTIVE' WHERE id = $1`, [
      id,
    ]);
    const token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
    return { id: id as string, token };
  };

  /** Creates a product with a video (sortOrder 1) and an image (sortOrder 0); returns its id. */
  const createProduct = async (seller: { id: string; token: string }) => {
    storage.files.add(tmpKey(seller.id, 1, 'mp4'));
    storage.files.add(tmpKey(seller.id, 2, 'png'));
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
            key: tmpKey(seller.id, 1, 'mp4'),
            type: 'VIDEO',
            extension: 'mp4',
            filename: 'demo.mp4',
            sortOrder: 1,
          },
          {
            key: tmpKey(seller.id, 2, 'png'),
            type: 'IMAGE',
            extension: 'png',
            filename: 'front.png',
            sortOrder: 0,
          },
        ],
      })
      .expect(201);
    return res.body.productId as string;
  };

  const mediaOf = async (productId: string, type: string) => {
    const [row] = await dataSource.query(
      'SELECT id, source FROM media WHERE owner_id = $1 AND type = $2',
      [productId, type],
    );
    return row as { id: string; source: string };
  };

  it('returns the product with its seller and ordered media, without login', async () => {
    const seller = await signUpSeller();
    const productId = await createProduct(seller);
    const image = await mediaOf(productId, 'IMAGE');
    const video = await mediaOf(productId, 'VIDEO');

    const res = await http().get(`/products/${productId}`).expect(200);

    expect(res.body).toEqual({
      id: productId,
      name: 'Lúa giống OM18',
      description: 'Bao 10kg, nảy mầm 95%',
      price: 250000,
      quantity: 40,
      unit: 'bag',
      categoryId,
      status: 'ACTIVE',
      distributorId: seller.id,
      media: [
        {
          id: image.id,
          type: 'IMAGE',
          url: `https://storage.test/${image.source}?signed=read`,
        },
        {
          id: video.id,
          type: 'VIDEO',
          url: `https://storage.test/${video.source}?signed=read`,
        },
      ],
    });
  });

  it('returns a product that is not ACTIVE', async () => {
    const productId = await createProduct(await signUpSeller());
    await dataSource.query(
      `UPDATE products SET status = 'OUT_OF_STOCK' WHERE id = $1`,
      [productId],
    );

    const res = await http().get(`/products/${productId}`).expect(200);

    expect(res.body.status).toBe('OUT_OF_STOCK');
  });

  it('404 PRODUCT_NOT_FOUND for a deleted or unknown product', async () => {
    const productId = await createProduct(await signUpSeller());
    await dataSource.query(
      'UPDATE products SET deleted_at = now() WHERE id = $1',
      [productId],
    );

    for (const id of [productId, unknownId]) {
      const res = await http().get(`/products/${id}`).expect(404);
      expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
    }
  });

  it('400 for a productId that is not a uuid', async () => {
    await http().get('/products/not-a-uuid').expect(400);
  });
});
