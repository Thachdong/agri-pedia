import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { AI_CLIENT_FACTORY, InMemoryAiClientFactory } from '@shared/ai';
import * as sharp from 'sharp';
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
  username: 'Agri Shop',
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

describe('POST /products/suggestions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let ai: InMemoryAiClientFactory;
  let png: Buffer;

  beforeAll(async () => {
    ai = new InMemoryAiClientFactory();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AI_CLIENT_FACTORY)
      .useValue(ai)
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    png = await sharp({
      create: { width: 400, height: 300, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    ai.requests.length = 0;
    await dataSource.query('DELETE FROM product_catalog_items');
    await dataSource.query('DELETE FROM product_suggestion_usages');
    await dataSource.query('DELETE FROM product_suggestion_misses');
    await dataSource.query('DELETE FROM product_suggestion_settings');
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
    await dataSource.query(
      `INSERT INTO product_catalog_items (id, name, normalized_name, description, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Anvil 5SC', 'anvil 5sc', 'Hexaconazole 50 g/l', now(), now())`,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object, activate = true) => {
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

  const suggest = (token: string | null, file: Buffer | null = png) => {
    const req = http().post('/products/suggestions');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    if (file) {
      req.attach('image', file, 'label.png');
    }
    return req;
  };

  it('FOUND: suggests the catalog item matching the name read (similar enough)', async () => {
    const seller = await signUp(distributor);
    ai.enqueue({ output: { productName: 'ANVIL 5 SC' } });

    const res = await suggest(seller.token).expect(200);

    expect(res.body).toEqual({
      status: 'FOUND',
      suggestion: { name: 'Anvil 5SC', description: 'Hexaconazole 50 g/l' },
      remaining: 49,
    });
    expect(ai.requests).toHaveLength(1);
  });

  it('NOT_FOUND: returns the name read, logs the miss, charges the hidden bonus', async () => {
    const seller = await signUp(distributor);
    ai.enqueue({ output: { productName: 'Thuốc Lạ 10WP' } });

    const res = await suggest(seller.token).expect(200);

    expect(res.body).toEqual({
      status: 'NOT_FOUND',
      detectedName: 'Thuốc Lạ 10WP',
      remaining: 50,
    });
    expect(
      await dataSource.query(
        'SELECT user_id, detected_name, normalized_name FROM product_suggestion_misses',
      ),
    ).toEqual([
      {
        user_id: seller.id,
        detected_name: 'Thuốc Lạ 10WP',
        normalized_name: 'thuoc la 10wp',
      },
    ]);
    expect(
      await dataSource.query(
        'SELECT used, bonus_used FROM product_suggestion_usages',
      ),
    ).toEqual([{ used: 0, bonus_used: 1 }]);
  });

  it('UNREADABLE when no name is read', async () => {
    const seller = await signUp(distributor);
    ai.enqueue({ output: { productName: '' } });

    const res = await suggest(seller.token).expect(200);

    expect(res.body).toEqual({ status: 'UNREADABLE', remaining: 49 });
  });

  it('422 PRODUCT_SUGGESTION_QUOTA_EXCEEDED once the visible quota is used up', async () => {
    const seller = await signUp(distributor);
    await dataSource.query(
      'INSERT INTO product_suggestion_settings (id, invalid_image_limit, not_found_limit) VALUES (1, 1, 0)',
    );
    ai.enqueue({ output: { productName: '' } });
    await suggest(seller.token).expect(200);

    const res = await suggest(seller.token);

    expect(res.body.code).toBe('PRODUCT_SUGGESTION_QUOTA_EXCEEDED');
    expect(res.status).toBe(422);
    expect(ai.requests).toHaveLength(1);
  });

  it('400 PRODUCT_SUGGESTION_INVALID_IMAGE without a photo or with a non-image', async () => {
    const seller = await signUp(distributor);

    const missing = await suggest(seller.token, null).expect(400);
    const garbage = await http()
      .post('/products/suggestions')
      .set('Authorization', `Bearer ${seller.token}`)
      .attach('image', Buffer.from('not an image'), {
        filename: 'label.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(missing.body.code).toBe('PRODUCT_SUGGESTION_INVALID_IMAGE');
    expect(garbage.body.code).toBe('PRODUCT_SUGGESTION_INVALID_IMAGE');
    expect(ai.requests).toHaveLength(0);
    expect(
      await dataSource.query('SELECT used FROM product_suggestion_usages'),
    ).toEqual([{ used: 0 }]);
  });

  it('403 PRODUCT_SELLER_NOT_ALLOWED for a farmer', async () => {
    const user = await signUp(farmer);

    const res = await suggest(user.token).expect(403);

    expect(res.body.code).toBe('PRODUCT_SELLER_NOT_ALLOWED');
  });

  it('401 without an access token', async () => {
    await suggest(null).expect(401);
  });
});
