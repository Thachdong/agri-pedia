import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
import { AppModule } from '../../src/app.module';

// Seeds the shipped sample articles (RICE_BLAST, DURIAN_PHYTOPHTHORA_CANKER) into a fake storage.
// The table is emptied afterwards so the next real start uploads the images to the real bucket.
describe('GET /knowledge/articles/* (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const storage = new InMemoryFileStorage();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_STORAGE)
      .useValue(storage)
      .compile();
    moduleRef.useLogger(false);
    dataSource = moduleRef.get(DataSource);
    if (dataSource.isInitialized)
      await dataSource.query('DELETE FROM articles');
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM articles');
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('uploads the article images as public objects on seed', () => {
    const keys = [...storage.uploaded.entries()]
      .filter(([, file]) => file.isPublic)
      .map(([key]) => key);

    expect(keys).toEqual([
      expect.stringMatching(
        /^articles\/RICE\/RICE_BLAST\/dao-on-la-hinh-thoi\.[0-9a-f]{8}\.webp$/,
      ),
    ]);
  });

  it('lists crops with articles, the disabled DURIAN included, cached 60s', async () => {
    const res = await http().get('/knowledge/articles/crops').expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body).toEqual({
      crops: [
        {
          code: 'RICE',
          slug: 'lua',
          nameVi: 'Lúa',
          diagnosisEnabled: expect.any(Boolean),
          articleCount: 1,
        },
        {
          code: 'DURIAN',
          slug: 'sau-rieng',
          nameVi: 'Sầu riêng',
          diagnosisEnabled: expect.any(Boolean),
          articleCount: 1,
        },
      ],
    });
  });

  it('lists the articles of a crop', async () => {
    const res = await http().get('/knowledge/articles?crop=lua').expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.crop).toMatchObject({ code: 'RICE', slug: 'lua' });
    expect(res.body.nextCursor).toBeNull();
    expect(res.body.articles).toEqual([
      {
        path: '/benh-cay-trong/lua/benh-dao-on',
        slug: 'benh-dao-on',
        title: expect.stringContaining('Bệnh đạo ôn'),
        summary: expect.any(String),
        coverUrl: expect.stringMatching(
          /^https:\/\/storage\.test\/articles\/RICE\/RICE_BLAST\//,
        ),
        status: 'REVIEWED',
        updatedAt: '2026-10-16T00:00:00.000Z',
        disease: {
          code: 'RICE_BLAST',
          nameVi: 'Bệnh đạo ôn',
          scientificName: expect.any(String),
          category: 'DISEASE',
        },
      },
    ]);
  });

  it('filters the list by disease category', async () => {
    const res = await http()
      .get('/knowledge/articles?crop=lua&category=PEST')
      .expect(200);

    expect(res.body.articles).toEqual([]);
  });

  it('returns 400 for invalid list queries', async () => {
    await http().get('/knowledge/articles').expect(400);
    await http().get('/knowledge/articles?crop=lua&limit=0').expect(400);
    await http().get('/knowledge/articles?crop=lua&category=X').expect(400);
  });

  it('returns 400 KNOWLEDGE_ARTICLE_INVALID_CURSOR for a malformed cursor', async () => {
    const res = await http()
      .get('/knowledge/articles?crop=lua&cursor=bad')
      .expect(400);

    expect(res.body.code).toBe('KNOWLEDGE_ARTICLE_INVALID_CURSOR');
  });

  it('returns 404 KNOWLEDGE_CROP_NOT_FOUND for an unknown crop slug', async () => {
    const list = await http().get('/knowledge/articles?crop=ngo').expect(404);
    const detail = await http()
      .get('/knowledge/articles/ngo/benh-dao-on')
      .expect(404);

    expect(list.body.code).toBe('KNOWLEDGE_CROP_NOT_FOUND');
    expect(detail.body.code).toBe('KNOWLEDGE_CROP_NOT_FOUND');
  });

  it('returns an article with resolved markdown and related diseases', async () => {
    const res = await http()
      .get('/knowledge/articles/lua/benh-dao-on')
      .expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    const body = res.body;
    expect(body).toMatchObject({
      path: '/benh-cay-trong/lua/benh-dao-on',
      crop: { code: 'RICE', slug: 'lua', nameVi: 'Lúa' },
      disease: { code: 'RICE_BLAST', verification: expect.any(String) },
      status: 'REVIEWED',
      reviewedBy: 'AI',
      reviewedAt: '2026-10-16T00:00:00.000Z',
      publishedAt: expect.any(String),
    });
    expect(body.markdown).toContain(
      '](https://storage.test/articles/RICE/RICE_BLAST/dao-on-la-hinh-thoi.',
    );
    // RICE_BROWN_SPOT has no article yet: link dropped, text kept
    expect(body.markdown).not.toContain('/diseases/');
    expect(body.markdown).toContain('| Bệnh đốm nâu |');
    expect(body.markdown).toContain('::disease-card{code="RICE_BROWN_SPOT"}');
    expect(body.cover).toEqual({
      url: expect.stringContaining('dao-on-la-hinh-thoi.'),
      alt: expect.any(String),
      width: 576,
      height: 499,
    });
    expect(body.images).toEqual([
      expect.objectContaining({
        width: 576,
        height: 499,
        credit: expect.objectContaining({ license: 'CC BY 4.0' }),
      }),
    ]);
    expect(body.relatedDiseases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RICE_BROWN_SPOT',
          path: null,
          coverUrl: null,
        }),
        expect.objectContaining({ code: 'RICE_NARROW_BROWN_SPOT' }),
      ]),
    );
    expect(body.sources.length).toBeGreaterThan(0);
  });

  it('returns 404 KNOWLEDGE_ARTICLE_NOT_FOUND for an unknown slug', async () => {
    const res = await http()
      .get('/knowledge/articles/lua/khong-co')
      .expect(404);

    expect(res.body.code).toBe('KNOWLEDGE_ARTICLE_NOT_FOUND');
  });

  it('returns 400 for a malformed slug', async () => {
    await http().get('/knowledge/articles/lua/Benh_Dao_On').expect(400);
  });

  it('lists REVIEWED articles in the sitemap', async () => {
    const res = await http().get('/knowledge/articles/sitemap').expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body).toEqual({
      crops: [
        { slug: 'lua', updatedAt: '2026-10-16T00:00:00.000Z' },
        { slug: 'sau-rieng', updatedAt: '2026-10-16T00:00:00.000Z' },
      ],
      articles: [
        {
          path: '/benh-cay-trong/lua/benh-dao-on',
          updatedAt: '2026-10-16T00:00:00.000Z',
        },
        {
          path: '/benh-cay-trong/sau-rieng/benh-nut-than-xi-mu',
          updatedAt: '2026-10-16T00:00:00.000Z',
        },
      ],
    });
  });

  it('links the article from the disease detail', async () => {
    const blast = await http()
      .get('/knowledge/diseases/RICE_BLAST')
      .expect(200);
    const brownSpot = await http()
      .get('/knowledge/diseases/RICE_BROWN_SPOT')
      .expect(200);

    expect(blast.body.article).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      status: 'REVIEWED',
    });
    expect(brownSpot.body.article).toBeNull();
  });
});
