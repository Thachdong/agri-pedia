import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { CreateAdminUseCase } from '../../src/modules/user/application/use-cases';
import { ELoginType } from '../../src/modules/user/domain';

const USERNAMES = `('e2e-catalog-admin', 'e2e-catalog-farmer')`;

describe('/admin/product-catalog + /admin/product-suggestion (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let farmerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await deleteUsers();
    const { userId: adminId } = await app.get(CreateAdminUseCase).execute({
      loginType: ELoginType.EMAIL,
      identifier: 'e2e-catalog-admin@agripedia.test',
      password: 'secret123',
      username: 'e2e-catalog-admin',
    });
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: 'e2e-catalog-farmer@agripedia.test',
        password: 'secret123',
        username: 'e2e-catalog-farmer',
        role: 'FARMER',
        bussinessType: null,
        address: {
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.03,
          long: 105.78,
        },
      })
      .expect(201);
    const [{ id: farmerId }] = await dataSource.query(
      `SELECT id FROM users WHERE username = 'e2e-catalog-farmer'`,
    );
    const tokens = app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE);
    adminToken = await tokens.sign({ userId: adminId });
    farmerToken = await tokens.sign({ userId: farmerId });
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM product_catalog_items');
    await dataSource.query('DELETE FROM product_suggestion_settings');
    await dataSource.query('DELETE FROM product_suggestion_misses');
  });

  afterAll(async () => {
    await deleteUsers();
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string, req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  async function deleteUsers() {
    const users = `SELECT id FROM users WHERE username IN ${USERNAMES}`;
    await dataSource.query(`DELETE FROM addresses WHERE user_id IN (${users})`);
    await dataSource.query(`DELETE FROM users WHERE username IN ${USERNAMES}`);
  }

  const createItem = (body: object) =>
    as(adminToken, http().post('/admin/product-catalog').send(body));

  describe('/admin/product-catalog', () => {
    it('creates, lists (search ignoring diacritics), updates and deletes an item', async () => {
      const created = await createItem({
        name: ' Đạm Phú Mỹ ',
        description: 'Urê 46% N',
      }).expect(201);
      await createItem({
        name: 'Anvil 5SC',
        description: 'Hexaconazole',
      }).expect(201);
      expect(created.body).toEqual({
        id: expect.any(String),
        name: 'Đạm Phú Mỹ',
        description: 'Urê 46% N',
        categoryId: null,
        unit: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const all = await as(
        adminToken,
        http().get('/admin/product-catalog?page=1&limit=1'),
      ).expect(200);
      expect(all.body).toMatchObject({ total: 2, page: 1, limit: 1 });
      expect(all.body.items.map((i: { name: string }) => i.name)).toEqual([
        'Anvil 5SC',
      ]);

      const found = await as(
        adminToken,
        http().get('/admin/product-catalog?search=dam%20phu'),
      ).expect(200);
      expect(found.body.items.map((i: { id: string }) => i.id)).toEqual([
        created.body.id,
      ]);

      const updated = await as(
        adminToken,
        http()
          .patch(`/admin/product-catalog/${created.body.id}`)
          .send({ description: 'Urê hạt đục 46% N' }),
      ).expect(200);
      expect(updated.body).toMatchObject({
        name: 'Đạm Phú Mỹ',
        description: 'Urê hạt đục 46% N',
      });

      await as(
        adminToken,
        http().delete(`/admin/product-catalog/${created.body.id}`),
      ).expect(200);
      const after = await as(
        adminToken,
        http().get('/admin/product-catalog'),
      ).expect(200);
      expect(after.body.total).toBe(1);
    });

    it('keeps the suggested category and unit; PATCH null clears them', async () => {
      const [{ id: categoryId }] = await dataSource.query(
        'SELECT id FROM categories ORDER BY name LIMIT 1',
      );

      const created = await createItem({
        name: 'Vi-ĐK',
        description: 'Trichoderma spp.',
        categoryId,
        unit: 'bag',
      }).expect(201);
      expect(created.body).toMatchObject({ categoryId, unit: 'bag' });

      const cleared = await as(
        adminToken,
        http()
          .patch(`/admin/product-catalog/${created.body.id}`)
          .send({ categoryId: null }),
      ).expect(200);
      expect(cleared.body).toMatchObject({ categoryId: null, unit: 'bag' });
    });

    it('404 PRODUCT_CATEGORY_NOT_FOUND for an unknown category', async () => {
      const res = await createItem({
        name: 'Vi-ĐK',
        description: 'x',
        categoryId: '00000000-0000-4000-8000-000000000000',
      });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PRODUCT_CATEGORY_NOT_FOUND');
    });

    it('409 PRODUCT_CATALOG_ITEM_NAME_TAKEN for the same name ignoring case and punctuation', async () => {
      await createItem({ name: 'Anvil 5SC', description: 'x' }).expect(201);

      const res = await createItem({ name: 'ANVIL-5SC', description: 'y' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('PRODUCT_CATALOG_ITEM_NAME_TAKEN');
    });

    it('400 for an invalid body, an unknown field or a bad id', async () => {
      await createItem({ name: '', description: 'x' }).expect(400);
      await createItem({ name: 'A', description: 'x', price: 1 }).expect(400);
      await createItem({ name: 'A', description: 'x', unit: 'liter' }).expect(
        400,
      );
      await createItem({
        name: 'A',
        description: 'x',
        categoryId: 'c1',
      }).expect(400);
      await as(
        adminToken,
        http().patch('/admin/product-catalog/not-a-uuid').send({ name: 'A' }),
      ).expect(400);
      const noLetters = await createItem({ name: '***', description: 'x' });
      expect(noLetters.status).toBe(400);
      expect(noLetters.body.code).toBe('PRODUCT_CATALOG_ITEM_INVALID');
    });

    it('404 PRODUCT_CATALOG_ITEM_NOT_FOUND for an unknown id', async () => {
      const res = await as(
        adminToken,
        http().delete(
          '/admin/product-catalog/00000000-0000-4000-8000-000000000000',
        ),
      ).expect(404);

      expect(res.body.code).toBe('PRODUCT_CATALOG_ITEM_NOT_FOUND');
    });
  });

  describe('/admin/product-suggestion', () => {
    it('returns the default settings, then the saved ones', async () => {
      const defaults = await as(
        adminToken,
        http().get('/admin/product-suggestion/settings'),
      ).expect(200);
      expect(defaults.body).toEqual({
        invalidImageLimit: 50,
        notFoundLimit: 50,
      });

      await as(
        adminToken,
        http()
          .put('/admin/product-suggestion/settings')
          .send({ invalidImageLimit: 30, notFoundLimit: 0 }),
      ).expect(200);
      const saved = await as(
        adminToken,
        http().get('/admin/product-suggestion/settings'),
      ).expect(200);
      expect(saved.body).toEqual({ invalidImageLimit: 30, notFoundLimit: 0 });
    });

    it('400 PRODUCT_SUGGESTION_INVALID_SETTINGS for an out-of-range limit', async () => {
      const res = await as(
        adminToken,
        http()
          .put('/admin/product-suggestion/settings')
          .send({ invalidImageLimit: 0, notFoundLimit: 10 }),
      ).expect(400);

      expect(res.body.code).toBe('PRODUCT_SUGGESTION_INVALID_SETTINGS');
    });

    it('returns no picked AI model and the env model, then the saved one, keeping the quotas', async () => {
      const defaults = {
        model: app.get<IConfigService>(CONFIG_SERVICE).get('productSuggestion')
          .model,
      };
      await as(
        adminToken,
        http()
          .put('/admin/product-suggestion/settings')
          .send({ invalidImageLimit: 30, notFoundLimit: 0 }),
      ).expect(200);
      await as(adminToken, http().get('/admin/product-suggestion/ai-model'))
        .expect(200)
        .expect({ model: null, defaults });

      const saved = await as(
        adminToken,
        http()
          .put('/admin/product-suggestion/ai-model')
          .send({ model: 'gemini-2.5-flash-lite' }),
      ).expect(200);

      expect(saved.body).toEqual({ model: 'gemini-2.5-flash-lite', defaults });
      await as(adminToken, http().get('/admin/product-suggestion/ai-model'))
        .expect(200)
        .expect({ model: 'gemini-2.5-flash-lite', defaults });
      await as(adminToken, http().get('/admin/product-suggestion/settings'))
        .expect(200)
        .expect({ invalidImageLimit: 30, notFoundLimit: 0 });

      await as(
        adminToken,
        http().put('/admin/product-suggestion/ai-model').send({ model: null }),
      ).expect(200);
      await as(adminToken, http().get('/admin/product-suggestion/ai-model'))
        .expect(200)
        .expect({ model: null, defaults });
    });

    it('400 for a missing or malformed AI model', async () => {
      await as(
        adminToken,
        http().put('/admin/product-suggestion/ai-model').send({}),
      ).expect(400);

      const res = await as(
        adminToken,
        http()
          .put('/admin/product-suggestion/ai-model')
          .send({ model: 'gemini flash' }),
      ).expect(400);

      expect(res.body.code).toBe('PRODUCT_SUGGESTION_INVALID_SETTINGS');
    });

    it('lists misses grouped by normalized name, most frequent first', async () => {
      const u1 = '00000000-0000-4000-8000-000000000001';
      const u2 = '00000000-0000-4000-8000-000000000002';
      await dataSource.query(
        `INSERT INTO product_suggestion_misses (id, user_id, detected_name, normalized_name, created_at) VALUES
         (gen_random_uuid(), $1, 'Thuoc A', 'thuoc a', '2026-10-01T00:00:00Z'),
         (gen_random_uuid(), $2, 'Thuốc A', 'thuoc a', '2026-10-03T00:00:00Z'),
         (gen_random_uuid(), $1, 'THUOC A', 'thuoc a', '2026-10-02T00:00:00Z'),
         (gen_random_uuid(), $2, 'Thuốc B', 'thuoc b', '2026-10-05T00:00:00Z')`,
        [u1, u2],
      );

      const res = await as(
        adminToken,
        http().get('/admin/product-suggestion/misses?limit=1'),
      ).expect(200);

      expect(res.body).toEqual({
        items: [
          {
            normalizedName: 'thuoc a',
            latestDetectedName: 'Thuốc A',
            count: 3,
            distributorCount: 2,
            lastSeenAt: '2026-10-03T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 1,
      });
    });
  });

  it.each([
    ['GET', '/admin/product-catalog'],
    ['POST', '/admin/product-catalog'],
    ['GET', '/admin/product-suggestion/settings'],
    ['GET', '/admin/product-suggestion/ai-model'],
    ['GET', '/admin/product-suggestion/misses'],
  ])(
    '403 PRODUCT_ADMIN_REQUIRED for a farmer on %s %s',
    async (method, path) => {
      const req =
        method === 'GET'
          ? http().get(path)
          : http().post(path).send({ name: 'A', description: 'B' });

      const res = await as(farmerToken, req).expect(403);

      expect(res.body.code).toBe('PRODUCT_ADMIN_REQUIRED');
    },
  );

  it('401 without an access token', async () => {
    await http().get('/admin/product-catalog').expect(401);
  });
});
