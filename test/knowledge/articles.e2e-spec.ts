import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
import { AppModule } from '../../src/app.module';

// Seeds the shipped articles of the crop packs into a fake storage. Assertions name only articles
// that are expected to stay (RICE_BLAST + variants, RICE_BROWN_SPOT, STEM_BORER, DURIAN canker);
// counts are read from the packs so adding an article does not break the suite.
// The table is emptied afterwards so the next real start uploads the images to the real bucket.
const PACKS = join(
  __dirname,
  '../../src/modules/knowledge/infrastructure/seed/crops',
);
const shipped = (crop: string): string[] =>
  readdirSync(join(PACKS, crop, 'articles')).filter((f) => f.endsWith('.md'));

type TListItem = {
  slug: string;
  variant: { code: string } | null;
  disease: { category: string } | null;
};

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

    for (const key of keys) {
      expect(key).toMatch(
        /^articles\/(RICE|DURIAN)\/[A-Z0-9_]+\/[a-z0-9-]+\.[0-9a-f]{8}\.webp$/,
      );
    }
    // A variant article keeps its images under its own code; covers are uploaded like body images.
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^articles\/RICE\/RICE_BLAST\/dao-on-la-hinh-thoi\./,
        ),
        expect.stringMatching(/^articles\/RICE\/RICE_BLAST\/benh-dao-on\./),
        expect.stringMatching(
          /^articles\/RICE\/RICE_BLAST__V1\/benh-dao-on-la\./,
        ),
      ]),
    );
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
          articleCount: shipped('RICE').length,
        },
        {
          code: 'DURIAN',
          slug: 'sau-rieng',
          nameVi: 'Sầu riêng',
          diagnosisEnabled: expect.any(Boolean),
          articleCount: shipped('DURIAN').length,
        },
      ],
    });
  });

  it('lists the articles of a crop', async () => {
    const res = await http().get('/knowledge/articles?crop=lua').expect(200);

    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.crop).toMatchObject({ code: 'RICE', slug: 'lua' });
    expect(res.body.nextCursor).toBeNull();
    const articles: TListItem[] = res.body.articles;
    expect(articles).toHaveLength(shipped('RICE').length);
    expect(articles.map((a) => [a.slug, a.variant?.code ?? null])).toEqual(
      expect.arrayContaining([
        ['benh-dao-on', null],
        ['benh-dao-on-co-bong', 'RICE_BLAST__V2'],
        ['benh-dao-on-dot-than', 'RICE_BLAST__V3'],
        ['benh-dao-on-la', 'RICE_BLAST__V1'],
      ]),
    );
    const bySlug = (slug: string) => articles.find((a) => a.slug === slug);
    expect(bySlug('benh-dao-on')).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      slug: 'benh-dao-on',
      title: expect.stringContaining('Bệnh đạo ôn'),
      summary: expect.any(String),
      coverUrl: expect.stringMatching(
        /^https:\/\/storage\.test\/articles\/RICE\/RICE_BLAST\/benh-dao-on\./,
      ),
      status: 'REVIEWED',
      updatedAt: expect.any(String),
      disease: {
        code: 'RICE_BLAST',
        nameVi: 'Bệnh đạo ôn',
        scientificName: expect.any(String),
        category: 'DISEASE',
      },
      variant: null,
    });
    expect(bySlug('benh-dao-on-la')).toMatchObject({
      disease: { code: 'RICE_BLAST' },
      variant: { code: 'RICE_BLAST__V1', name: expect.any(String) },
    });
  });

  it('filters the list by disease category', async () => {
    const res = await http()
      .get('/knowledge/articles?crop=lua&category=PEST')
      .expect(200);

    const articles: TListItem[] = res.body.articles;
    expect(articles.map((a) => a.slug)).toContain('sau-duc-than');
    expect(articles.every((a) => a.disease?.category === 'PEST')).toBe(true);
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
      reviewedAt: expect.any(String),
      publishedAt: expect.any(String),
    });
    expect(body.markdown).toContain(
      '](https://storage.test/articles/RICE/RICE_BLAST/dao-on-la-hinh-thoi.',
    );
    expect(body.markdown).not.toContain('/diseases/');
    expect(body.markdown).toContain(
      '[Bệnh đốm nâu](/benh-cay-trong/lua/benh-dom-nau)',
    );
    expect(body.markdown).toContain('::disease-card{code="RICE_BROWN_SPOT"}');
    // links to variant ids go to the variant articles
    expect(body.markdown).toContain('](/benh-cay-trong/lua/benh-dao-on-la)');
    expect(body.markdown).toContain(
      '](/benh-cay-trong/lua/benh-dao-on-co-bong)',
    );
    expect(body.variant).toBeNull();
    expect(body.parentArticle).toBeNull();
    const variantCover = (code: string, slug: string) =>
      expect.stringMatching(
        new RegExp(`^https://storage\\.test/articles/RICE/${code}/${slug}\\.`),
      );
    expect(body.variantArticles).toEqual([
      {
        path: '/benh-cay-trong/lua/benh-dao-on-la',
        title: expect.any(String),
        variantCode: 'RICE_BLAST__V1',
        variantName: expect.any(String),
        coverUrl: variantCover('RICE_BLAST__V1', 'benh-dao-on-la'),
      },
      {
        path: '/benh-cay-trong/lua/benh-dao-on-co-bong',
        title: expect.any(String),
        variantCode: 'RICE_BLAST__V2',
        variantName: expect.any(String),
        coverUrl: variantCover('RICE_BLAST__V2', 'benh-dao-on-co-bong'),
      },
      {
        path: '/benh-cay-trong/lua/benh-dao-on-dot-than',
        title: expect.any(String),
        variantCode: 'RICE_BLAST__V3',
        variantName: expect.any(String),
        coverUrl: variantCover('RICE_BLAST__V3', 'benh-dao-on-dot-than'),
      },
    ]);
    // 16:9 cover that the body does not show: listed after the body images (credits).
    expect(body.cover).toEqual({
      url: expect.stringContaining('/RICE_BLAST/benh-dao-on.'),
      alt: expect.any(String),
      width: 576,
      height: 324,
    });
    expect(body.images.map((i: { url: string }) => i.url)).toEqual([
      expect.stringContaining('/RICE_BLAST/dao-on-la-hinh-thoi.'),
      expect.stringContaining('/RICE_BLAST/benh-dao-on.'),
    ]);
    expect(body.images[0].credit).toMatchObject({ license: 'CC BY 4.0' });
    expect(body.relatedDiseases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RICE_BROWN_SPOT',
          path: '/benh-cay-trong/lua/benh-dom-nau',
          coverUrl: expect.stringContaining('/RICE_BROWN_SPOT/benh-dom-nau.'),
        }),
        expect.objectContaining({ code: 'RICE_NARROW_BROWN_SPOT' }),
      ]),
    );
    expect(body.sources.length).toBeGreaterThan(0);
  });

  it('returns a variant article with its variant and the main article as parent', async () => {
    const res = await http()
      .get('/knowledge/articles/lua/benh-dao-on-co-bong')
      .expect(200);

    expect(res.body).toMatchObject({
      path: '/benh-cay-trong/lua/benh-dao-on-co-bong',
      disease: { code: 'RICE_BLAST' },
      variant: { code: 'RICE_BLAST__V2', name: expect.any(String) },
      parentArticle: {
        path: '/benh-cay-trong/lua/benh-dao-on',
        title: expect.stringContaining('Bệnh đạo ôn'),
      },
      variantArticles: [],
      cover: {
        url: expect.stringContaining('/RICE_BLAST__V2/benh-dao-on-co-bong.'),
        alt: expect.any(String),
        width: 1200,
        height: 675,
      },
    });
    expect(res.body.markdown).toContain('](/benh-cay-trong/lua/benh-dao-on)');
    expect(res.body.markdown).not.toContain('/diseases/');
  });

  it('drops links to diseases without an article, keeping the text', async () => {
    const res = await http()
      .get('/knowledge/articles/lua/sau-duc-than')
      .expect(200);

    // RAT and BLACK_BUG have no article
    expect(res.body.markdown).not.toContain('/diseases/');
    expect(res.body.markdown).toContain('Chuột hại');
    expect(res.body.relatedDiseases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RAT', path: null, coverUrl: null }),
      ]),
    );
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
    expect(res.body.crops).toEqual([
      { slug: 'lua', updatedAt: expect.any(String) },
      { slug: 'sau-rieng', updatedAt: expect.any(String) },
    ]);
    // all shipped articles are REVIEWED
    expect(res.body.articles).toHaveLength(
      shipped('RICE').length + shipped('DURIAN').length,
    );
    expect(res.body.articles).toEqual(
      expect.arrayContaining(
        [
          '/benh-cay-trong/lua/benh-dao-on',
          '/benh-cay-trong/lua/benh-dao-on-la',
          '/benh-cay-trong/lua/benh-dom-nau',
          '/benh-cay-trong/sau-rieng/benh-nut-than-xi-mu',
        ].map((path) => ({ path, updatedAt: expect.any(String) })),
      ),
    );
  });

  it('links the article from the disease detail', async () => {
    const blast = await http()
      .get('/knowledge/diseases/RICE_BLAST')
      .expect(200);
    const brownSpot = await http()
      .get('/knowledge/diseases/RICE_BROWN_SPOT')
      .expect(200);
    const sheathBlight = await http()
      .get('/knowledge/diseases/RICE_SHEATH_BLIGHT')
      .expect(200);

    expect(blast.body.article).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      status: 'REVIEWED',
    });
    expect(
      blast.body.variants.map(
        (v: { code: string; article: { path: string } | null }) => [
          v.code,
          v.article?.path ?? null,
        ],
      ),
    ).toEqual([
      ['RICE_BLAST__V1', '/benh-cay-trong/lua/benh-dao-on-la'],
      ['RICE_BLAST__V2', '/benh-cay-trong/lua/benh-dao-on-co-bong'],
      ['RICE_BLAST__V3', '/benh-cay-trong/lua/benh-dao-on-dot-than'],
    ]);
    expect(brownSpot.body.article).toEqual({
      path: '/benh-cay-trong/lua/benh-dom-nau',
      status: 'REVIEWED',
    });
    // no article in the pack
    expect(sheathBlight.body.article).toBeNull();
  });
});
