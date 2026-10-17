import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
import * as sharp from 'sharp';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ARTICLE_CACHE_INVALIDATOR } from '../../src/modules/knowledge/application/ports';
import { InMemoryArticleCacheInvalidator } from '../../src/modules/knowledge/application/ports/fakes';
import { CreateAdminUseCase } from '../../src/modules/user/application/use-cases';
import { ELoginType } from '../../src/modules/user/domain';

type TTarget = {
  code: string;
  variantCode: string | null;
  article: { slug: string; origin: string; isPublished: boolean } | null;
};

const CREDIT = {
  source: 'IRRI Rice Knowledge Bank',
  author: 'IRRI',
  license: 'CC BY 4.0',
  url: 'https://www.knowledgebank.irri.org/',
};
const SUMMARY =
  'Cách nhận biết sớm, điều kiện phát sinh và các biện pháp phòng trừ hiệu quả trên ruộng lúa.';

// Seeds the shipped articles into a fake storage; the table is emptied afterwards so the next real
// start reseeds them (this suite edits RICE_BLAST).
describe('/admin/knowledge (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const storage = new InMemoryFileStorage();
  const invalidator = new InMemoryArticleCacheInvalidator();
  let adminId: string;
  let adminToken: string;
  let farmerToken: string;
  /** A RICE disease without an article. */
  let freeCode: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FILE_STORAGE)
      .useValue(storage)
      .overrideProvider(ARTICLE_CACHE_INVALIDATOR)
      .useValue(invalidator)
      .compile();
    moduleRef.useLogger(false);
    dataSource = moduleRef.get(DataSource);
    if (dataSource.isInitialized) {
      await dataSource.query('DELETE FROM articles');
    }
    app = moduleRef.createNestApplication();
    await app.init();

    await dataSource.query(
      `DELETE FROM users WHERE username IN ('e2e-admin', 'e2e-farmer')`,
    );
    ({ userId: adminId } = await app.get(CreateAdminUseCase).execute({
      loginType: ELoginType.EMAIL,
      identifier: 'e2e-admin@agripedia.test',
      password: 'secret123',
      username: 'e2e-admin',
    }));
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: 'e2e-farmer@agripedia.test',
        password: 'secret123',
        username: 'e2e-farmer',
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
      `SELECT id FROM users WHERE username = 'e2e-farmer'`,
    );
    const tokens = app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE);
    adminToken = await tokens.sign({ userId: adminId });
    farmerToken = await tokens.sign({ userId: farmerId });

    const res = await asAdmin(
      http().get('/admin/knowledge/crops/lua/articles'),
    );
    freeCode = (res.body.targets as TTarget[]).find(
      (t) => !t.variantCode && !t.article,
    )?.code as string;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM articles');
    const users = `SELECT id FROM users WHERE username IN ('e2e-admin', 'e2e-farmer')`;
    await dataSource.query(`DELETE FROM addresses WHERE user_id IN (${users})`);
    await dataSource.query(
      `DELETE FROM users WHERE username IN ('e2e-admin', 'e2e-farmer')`,
    );
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const asAdmin = (req: request.Test) =>
    req.set('Authorization', `Bearer ${adminToken}`);

  /** Uploads a PNG to the admin's TMP folder, as a presigned PUT would. */
  const upload = async (name: string): Promise<string> => {
    const key = `tmp/${adminId}/${name}.png`;
    const png = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: '#4a7' },
    })
      .png()
      .toBuffer();
    await storage.uploadFile(key, png, 'image/png');
    return key;
  };

  const newArticle = async (overrides: object = {}) => ({
    code: freeCode,
    slug: 'bai-admin-e2e',
    title: 'Bài do admin viết',
    summary: SUMMARY,
    markdown: 'Mở đầu.\n\n![Triệu chứng](trieu-chung.webp)\n',
    cover: 'trieu-chung.webp',
    images: [
      {
        file: 'trieu-chung.webp',
        tmpKey: await upload('trieu-chung'),
        alt: 'Triệu chứng trên lá',
        credit: CREDIT,
      },
    ],
    sources: [{ title: 'IRRI', url: 'https://www.knowledgebank.irri.org/' }],
    ...overrides,
  });

  it('requires an access token (401) of an admin (403)', async () => {
    const unauthenticated = await http()
      .get('/admin/knowledge/crops/lua/articles')
      .expect(401);
    expect(unauthenticated.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');

    const farmer = await http()
      .get('/admin/knowledge/crops/lua/articles')
      .set('Authorization', `Bearer ${farmerToken}`)
      .expect(403);
    expect(farmer.body.code).toBe('KNOWLEDGE_ADMIN_REQUIRED');
  });

  it('lists the diseases and variants of a crop with their articles', async () => {
    const res = await asAdmin(
      http().get('/admin/knowledge/crops/lua/articles'),
    ).expect(200);

    expect(res.body.crop).toEqual({ code: 'RICE', slug: 'lua', nameVi: 'Lúa' });
    const targets = res.body.targets as TTarget[];
    expect(targets).toContainEqual(
      expect.objectContaining({
        code: 'RICE_BLAST',
        variantCode: null,
        article: expect.objectContaining({
          slug: 'benh-dao-on',
          origin: 'AI',
          isPublished: true,
        }),
      }),
    );
    expect(targets).toContainEqual(
      expect.objectContaining({
        code: 'RICE_BLAST__V1',
        variantCode: 'RICE_BLAST__V1',
      }),
    );
    expect(freeCode).toBeDefined();
  });

  it('returns 404 for an unknown crop', async () => {
    const res = await asAdmin(
      http().get('/admin/knowledge/crops/ngo/articles'),
    ).expect(404);
    expect(res.body.code).toBe('KNOWLEDGE_CROP_NOT_FOUND');
  });

  it('returns the stored content of an article', async () => {
    const res = await asAdmin(
      http().get('/admin/knowledge/articles/RICE_BLAST'),
    ).expect(200);

    expect(res.body).toMatchObject({
      code: 'RICE_BLAST',
      crop: { code: 'RICE', slug: 'lua' },
      slug: 'benh-dao-on',
      origin: 'AI',
      isPublished: true,
    });
    expect(res.body.markdown).not.toContain('https://');
    expect(res.body.images[0]).toMatchObject({
      file: expect.stringMatching(/\.webp$/),
      url: expect.stringMatching(/^https:\/\/storage\.test\/articles\/RICE\//),
    });
  });

  it('returns 404 for a code without an article', async () => {
    const res = await asAdmin(
      http().get(`/admin/knowledge/articles/${freeCode}`),
    ).expect(404);
    expect(res.body.code).toBe('KNOWLEDGE_ARTICLE_NOT_FOUND');
  });

  it('creates a published ADMIN article from uploaded images', async () => {
    const body = await newArticle();

    const res = await asAdmin(http().post('/admin/knowledge/articles'))
      .send(body)
      .expect(201);

    expect(res.body).toEqual({
      code: freeCode,
      slug: 'bai-admin-e2e',
      path: '/benh-cay-trong/lua/bai-admin-e2e',
    });
    const detail = await asAdmin(
      http().get(`/admin/knowledge/articles/${freeCode}`),
    ).expect(200);
    expect(detail.body).toMatchObject({
      origin: 'ADMIN',
      isPublished: true,
      status: 'REVIEWED',
      reviewedBy: adminId,
      editedBy: adminId,
    });
    expect(detail.body.images).toEqual([
      expect.objectContaining({
        file: 'trieu-chung.webp',
        url: expect.stringMatching(
          new RegExp(
            `/articles/RICE/${freeCode}/trieu-chung\\.[0-9a-f]{8}\\.webp$`,
          ),
        ),
        width: 1600,
        height: 800,
      }),
    ]);
    expect(storage.files.has(body.images[0].tmpKey)).toBe(false);
    await http().get('/knowledge/articles/lua/bai-admin-e2e').expect(200);
  });

  it('rejects a second article for the code (409), a taken slug (409)', async () => {
    const again = await asAdmin(http().post('/admin/knowledge/articles'))
      .send(await newArticle({ slug: 'bai-khac' }))
      .expect(409);
    expect(again.body.code).toBe('KNOWLEDGE_ARTICLE_ALREADY_EXISTS');

    const target = (
      await asAdmin(http().get('/admin/knowledge/crops/lua/articles'))
    ).body.targets.find(
      (t: TTarget) => !t.variantCode && !t.article,
    ) as TTarget;
    const slugTaken = await asAdmin(http().post('/admin/knowledge/articles'))
      .send(await newArticle({ code: target.code, slug: 'benh-dao-on' }))
      .expect(409);
    expect(slugTaken.body.code).toBe('KNOWLEDGE_ARTICLE_SLUG_TAKEN');
  });

  it('rejects a malformed body (400), invalid content (400), a foreign upload (400)', async () => {
    await asAdmin(http().post('/admin/knowledge/articles'))
      .send(await newArticle({ code: 'RICE_BLAST', slug: 'Bài Mới' }))
      .expect(400);

    const target = (
      await asAdmin(http().get('/admin/knowledge/crops/lua/articles'))
    ).body.targets.find(
      (t: TTarget) => !t.variantCode && !t.article,
    ) as TTarget;
    const content = await asAdmin(http().post('/admin/knowledge/articles'))
      .send(
        await newArticle({
          code: target.code,
          slug: 'bai-loi',
          cover: 'khong-co.webp',
        }),
      )
      .expect(400);
    expect(content.body.code).toBe('KNOWLEDGE_ARTICLE_INVALID_CONTENT');
    expect(content.body.details.issues).toEqual([
      'cover khong-co.webp is not listed in images',
    ]);

    const foreign = await asAdmin(http().post('/admin/knowledge/articles'))
      .send(
        await newArticle({
          code: target.code,
          slug: 'bai-loi',
          images: [
            {
              file: 'trieu-chung.webp',
              tmpKey: 'tmp/someone-else/a.png',
              alt: 'a',
              credit: CREDIT,
            },
          ],
        }),
      )
      .expect(400);
    expect(foreign.body.code).toBe('KNOWLEDGE_ARTICLE_IMAGE_INVALID');
  });

  it('edits an AI article, which becomes AI_REVIEWED with the same slug', async () => {
    const stored = (
      await asAdmin(http().get('/admin/knowledge/articles/RICE_BLAST'))
    ).body;

    const res = await asAdmin(
      http().put('/admin/knowledge/articles/RICE_BLAST'),
    )
      .send({
        title: 'Bệnh đạo ôn lúa (đã duyệt)',
        summary: stored.summary,
        markdown: stored.markdown,
        cover: stored.cover,
        images: stored.images.map(
          (i: {
            file: string;
            alt: string;
            caption: string | null;
            credit: object;
          }) => ({
            file: i.file,
            alt: i.alt,
            caption: i.caption,
            credit: i.credit,
          }),
        ),
        sources: stored.sources,
      })
      .expect(200);

    expect(res.body).toEqual({
      code: 'RICE_BLAST',
      slug: 'benh-dao-on',
      path: '/benh-cay-trong/lua/benh-dao-on',
      origin: 'AI_REVIEWED',
    });
    const page = await http()
      .get('/knowledge/articles/lua/benh-dao-on')
      .expect(200);
    expect(page.body.title).toBe('Bệnh đạo ôn lúa (đã duyệt)');
    expect(page.body.reviewedBy).toBe(adminId);
  });

  it('unpublishes an article (public 404) and publishes it again', async () => {
    const hidden = await asAdmin(
      http().post(`/admin/knowledge/articles/${freeCode}/unpublish`),
    ).expect(200);
    expect(hidden.body).toEqual({ code: freeCode, isPublished: false });
    await http().get('/knowledge/articles/lua/bai-admin-e2e').expect(404);
    const sitemap = await http().get('/knowledge/articles/sitemap').expect(200);
    expect(JSON.stringify(sitemap.body)).not.toContain('bai-admin-e2e');

    const shown = await asAdmin(
      http().post(`/admin/knowledge/articles/${freeCode}/publish`),
    ).expect(200);
    expect(shown.body).toEqual({ code: freeCode, isPublished: true });
    await http().get('/knowledge/articles/lua/bai-admin-e2e').expect(200);
  });

  it('validates the code parameter (400)', async () => {
    await asAdmin(
      http().post('/admin/knowledge/articles/rice-blast/unpublish'),
    ).expect(400);
  });
});
