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
import { CreateAdminUseCase } from '../../src/modules/user/application/use-cases';
import { ELoginType } from '../../src/modules/user/domain';

type TTarget = { article: { slug: string; isPublished: boolean } | null };

const USERNAMES = `('e2e-top-admin', 'e2e-top-farmer')`;

describe('top articles (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let farmerToken: string;
  /** Published RICE article slugs. */
  let slugs: string[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FILE_STORAGE)
      .useValue(new InMemoryFileStorage())
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await deleteUsers();
    const { userId: adminId } = await app.get(CreateAdminUseCase).execute({
      loginType: ELoginType.EMAIL,
      identifier: 'e2e-top-admin@agripedia.test',
      password: 'secret123',
      username: 'e2e-top-admin',
    });
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: 'e2e-top-farmer@agripedia.test',
        password: 'secret123',
        username: 'e2e-top-farmer',
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
      `SELECT id FROM users WHERE username = 'e2e-top-farmer'`,
    );
    const tokens = app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE);
    adminToken = await tokens.sign({ userId: adminId });
    farmerToken = await tokens.sign({ userId: farmerId });

    const res = await asAdmin(
      http().get('/admin/knowledge/crops/lua/articles'),
    ).expect(200);
    slugs = (res.body.targets as TTarget[]).flatMap((t) =>
      t.article?.isPublished ? [t.article.slug] : [],
    );
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM knowledge_crop_top_articles');
    await dataSource.query('DELETE FROM knowledge_settings');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM knowledge_crop_top_articles');
    await dataSource.query('DELETE FROM knowledge_settings');
    await deleteUsers();
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) =>
    req.set('Authorization', `Bearer ${adminToken}`);
  const asFarmer = (req: request.Test) =>
    req.set('Authorization', `Bearer ${farmerToken}`);

  async function deleteUsers() {
    const users = `SELECT id FROM users WHERE username IN ${USERNAMES}`;
    await dataSource.query(`DELETE FROM addresses WHERE user_id IN (${users})`);
    await dataSource.query(`DELETE FROM users WHERE username IN ${USERNAMES}`);
  }

  it('has at least 3 published RICE articles to work with', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(3);
  });

  it('gets and changes the limit', async () => {
    await asAdmin(http().get('/admin/knowledge/settings'))
      .expect(200)
      .expect({ limit: 10 });
    await asAdmin(http().put('/admin/knowledge/settings').send({ limit: 2 }))
      .expect(200)
      .expect({ limit: 2 });
    await asAdmin(http().get('/admin/knowledge/settings'))
      .expect(200)
      .expect({ limit: 2 });

    const res = await asAdmin(
      http().put('/admin/knowledge/settings').send({ limit: 51 }),
    ).expect(400);
    expect(res.body.code).toBe('KNOWLEDGE_INVALID_TOP_ARTICLE_SETTINGS');
  });

  it('sets the top articles of a crop and lists them publicly in order', async () => {
    const chosen = [slugs[2], slugs[0]];

    const set = await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: chosen }),
    ).expect(200);
    expect(set.body.crop).toEqual({ code: 'RICE', slug: 'lua', nameVi: 'Lúa' });
    expect(set.body.limit).toBe(10);
    expect(set.body.articles.map((a: { slug: string }) => a.slug)).toEqual(
      chosen,
    );

    const got = await asAdmin(
      http().get('/admin/knowledge/crops/lua/top-articles'),
    ).expect(200);
    expect(got.body).toEqual(set.body);

    const pub = await http()
      .get('/knowledge/articles/top?crop=lua')
      .expect(200)
      .expect('Cache-Control', 'public, max-age=60');
    expect(pub.body.crop.code).toBe('RICE');
    expect(pub.body.articles.map((a: { slug: string }) => a.slug)).toEqual(
      chosen,
    );
  });

  it('cuts the public list to the limit', async () => {
    await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: slugs.slice(0, 3) }),
    ).expect(200);
    await asAdmin(
      http().put('/admin/knowledge/settings').send({ limit: 1 }),
    ).expect(200);

    const pub = await http()
      .get('/knowledge/articles/top?crop=lua')
      .expect(200);
    expect(pub.body.articles.map((a: { slug: string }) => a.slug)).toEqual([
      slugs[0],
    ]);
  });

  it('returns an empty public list when none were chosen', async () => {
    const pub = await http()
      .get('/knowledge/articles/top?crop=lua')
      .expect(200);
    expect(pub.body.articles).toEqual([]);
  });

  it('rejects unknown, duplicated and too many articles', async () => {
    const unknown = await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: [slugs[0], 'khong-co'] }),
    ).expect(400);
    expect(unknown.body).toMatchObject({
      code: 'KNOWLEDGE_TOP_ARTICLES_INVALID',
      details: { reason: 'not articles of crop RICE', articles: ['khong-co'] },
    });

    const duplicated = await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: [slugs[0], slugs[0]] }),
    ).expect(400);
    expect(duplicated.body.details.reason).toBe('duplicated articles');

    await asAdmin(
      http().put('/admin/knowledge/settings').send({ limit: 1 }),
    ).expect(200);
    const tooMany = await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: slugs.slice(0, 2) }),
    ).expect(400);
    expect(tooMany.body.code).toBe('KNOWLEDGE_TOP_ARTICLES_INVALID');
  });

  it('returns 400 for a bad body or query, 404 for an unknown crop', async () => {
    await asAdmin(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: ['Not A Slug'] }),
    ).expect(400);
    await http().get('/knowledge/articles/top').expect(400);

    const res = await asAdmin(
      http().get('/admin/knowledge/crops/khong-co/top-articles'),
    ).expect(404);
    expect(res.body.code).toBe('KNOWLEDGE_CROP_NOT_FOUND');
    await http().get('/knowledge/articles/top?crop=khong-co').expect(404);
  });

  it('returns 403 for a non-admin and 401 without a token', async () => {
    const res = await asFarmer(http().get('/admin/knowledge/settings')).expect(
      403,
    );
    expect(res.body.code).toBe('KNOWLEDGE_ADMIN_REQUIRED');
    await asFarmer(
      http()
        .put('/admin/knowledge/crops/lua/top-articles')
        .send({ articleSlugs: [] }),
    ).expect(403);
    await http().get('/admin/knowledge/crops/lua/top-articles').expect(401);
  });
});
