import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import { EArticleOrigin } from '../../domain';
import {
  buildArticle,
  buildArticleSeed,
  buildArticleSeedImage,
  buildCrop,
  InMemoryArticleRepository,
  InMemoryArticleSource,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { SeedArticlesUseCase } from './seed-articles.use-case';

const IMAGE_KEY = (sha: string) =>
  `articles/RICE/RICE_BLAST/dao-on-1.${sha.slice(0, 8)}.webp`;

function setup() {
  const source = new InMemoryArticleSource([buildArticleSeed()]);
  const articles = new InMemoryArticleRepository();
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  const storage = new InMemoryFileStorage();
  const logger = new InMemoryLogger();
  const useCase = new SeedArticlesUseCase(
    source,
    articles,
    knowledge,
    storage,
    new InMemoryUnitOfWork(),
    logger,
  );
  return { source, articles, storage, logger, useCase };
}

describe('SeedArticlesUseCase', () => {
  it('uploads images publicly and inserts a new article', async () => {
    const { source, articles, storage, useCase } = setup();
    const image = source.seeds[0].images[0];

    const result = await useCase.execute();

    expect(result).toEqual({
      upserted: [
        {
          cropSlug: 'lua',
          slug: 'benh-dao-on',
          oldSlug: null,
          diseaseCode: 'RICE_BLAST',
          variantCode: null,
          linkChanged: true,
        },
      ],
      deleted: [],
    });
    expect(storage.uploaded.get(IMAGE_KEY(image.sha256))).toEqual({
      content: image.content,
      contentType: 'image/webp',
      isPublic: true,
    });
    const [article] = await articles.findAllForSeed();
    expect(article.slug).toBe('benh-dao-on');
    expect(article.images[0]).toMatchObject({
      file: 'dao-on-1.webp',
      key: IMAGE_KEY(image.sha256),
      width: 800,
      height: 600,
    });
    expect(article.contentHash).toBe(source.seeds[0].contentHash);
  });

  it('changes nothing on a second run with the same pack', async () => {
    const { articles, storage, useCase } = setup();
    await useCase.execute();
    const before = await articles.findAllForSeed();
    storage.uploaded.clear();

    const result = await useCase.execute();

    expect(result).toEqual({ upserted: [], deleted: [] });
    expect(storage.uploaded.size).toBe(0);
    expect(await articles.findAllForSeed()).toEqual(before);
  });

  it('uploads only the changed image and keeps id and publishedAt', async () => {
    const { source, articles, storage, useCase } = setup();
    source.seeds = [
      buildArticleSeed({
        images: [
          buildArticleSeedImage('dao-on-1.webp'),
          buildArticleSeedImage('dao-on-2.webp'),
        ],
      }),
    ];
    await useCase.execute();
    const [first] = await articles.findAllForSeed();
    const { id, publishedAt } = first;
    storage.uploaded.clear();
    const changed = buildArticleSeedImage('dao-on-2.webp', 'new pixels');
    source.seeds = [
      buildArticleSeed({
        images: [buildArticleSeedImage('dao-on-1.webp'), changed],
      }),
    ];

    const result = await useCase.execute();

    expect([...storage.uploaded.keys()]).toEqual([
      `articles/RICE/RICE_BLAST/dao-on-2.${changed.sha256.slice(0, 8)}.webp`,
    ]);
    // cover (dao-on-1) unchanged, same slug and title
    expect(result.upserted).toEqual([
      expect.objectContaining({ slug: 'benh-dao-on', linkChanged: false }),
    ]);
    const [article] = await articles.findAllForSeed();
    expect(article.id).toBe(id);
    expect(article.publishedAt).toEqual(publishedAt);
  });

  it('flags a changed cover image as a link change', async () => {
    const { source, useCase } = setup();
    await useCase.execute();
    source.seeds = [
      buildArticleSeed({
        images: [buildArticleSeedImage('dao-on-1.webp', 'new cover')],
      }),
    ];

    const result = await useCase.execute();

    expect(result.upserted[0].linkChanged).toBe(true);
  });

  it('reports the old slug when an article is renamed', async () => {
    const { source, articles, useCase } = setup();
    await useCase.execute();
    source.seeds = [buildArticleSeed({ slug: 'dao-on' })];

    const result = await useCase.execute();

    expect(result.upserted).toEqual([
      {
        cropSlug: 'lua',
        slug: 'dao-on',
        oldSlug: 'benh-dao-on',
        diseaseCode: 'RICE_BLAST',
        variantCode: null,
        linkChanged: true,
      },
    ]);
    expect((await articles.findAllForSeed()).map((a) => a.slug)).toEqual([
      'dao-on',
    ]);
  });

  it('keeps a variant article apart from the main article of its disease', async () => {
    const { source, articles, storage, useCase } = setup();
    const variant = buildArticleSeed({
      variantCode: 'RICE_BLAST__V1',
      slug: 'benh-dao-on-la',
      title: 'Đạo ôn lá',
    });
    source.seeds = [buildArticleSeed(), variant];

    const result = await useCase.execute();

    expect(result.upserted.map((a) => [a.slug, a.variantCode])).toEqual([
      ['benh-dao-on', null],
      ['benh-dao-on-la', 'RICE_BLAST__V1'],
    ]);
    const stored = await articles.findAllForSeed();
    expect(stored.map((a) => [a.diseaseCode, a.variantCode])).toEqual([
      ['RICE_BLAST', null],
      ['RICE_BLAST', 'RICE_BLAST__V1'],
    ]);
    const sha = variant.images[0].sha256.slice(0, 8);
    expect(
      storage.uploaded.has(`articles/RICE/RICE_BLAST__V1/dao-on-1.${sha}.webp`),
    ).toBe(true);

    // matched by KB code: an unchanged pack changes nothing, dropping the variant deletes only it
    expect(await useCase.execute()).toEqual({ upserted: [], deleted: [] });
    source.seeds = [buildArticleSeed()];
    expect((await useCase.execute()).deleted).toEqual([
      {
        cropSlug: 'lua',
        slug: 'benh-dao-on-la',
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V1',
      },
    ]);
  });

  it('deletes articles no longer in the pack', async () => {
    const { source, articles, useCase } = setup();
    await useCase.execute();
    source.seeds = [];

    const result = await useCase.execute();

    expect(result).toEqual({
      upserted: [],
      deleted: [
        {
          cropSlug: 'lua',
          slug: 'benh-dao-on',
          diseaseCode: 'RICE_BLAST',
          variantCode: null,
        },
      ],
    });
    expect(await articles.findAllForSeed()).toEqual([]);
  });

  it('leaves the table unchanged when an upload fails', async () => {
    const { articles, storage, useCase } = setup();
    jest
      .spyOn(storage, 'uploadPublicFile')
      .mockRejectedValue(new Error('storage down'));

    await expect(useCase.execute()).rejects.toThrow('storage down');
    expect(await articles.findAllForSeed()).toEqual([]);
  });

  it('rejects an article of a crop that is not seeded', async () => {
    const { source, useCase } = setup();
    source.seeds = [buildArticleSeed({ cropType: 'CORN' })];

    await expect(useCase.execute()).rejects.toThrow(
      'Article crop CORN is not seeded',
    );
  });

  it.each([EArticleOrigin.ADMIN, EArticleOrigin.AI_REVIEWED])(
    'skips a pack article whose code has an %s article, and never deletes it',
    async (origin) => {
      const { source, articles, storage, logger, useCase } = setup();
      const admin = buildArticle({ origin, editedBy: 'admin-1', title: 'Sửa' });
      articles.articles.set(admin.id, admin);

      await expect(useCase.execute()).resolves.toEqual({
        upserted: [],
        deleted: [],
      });
      source.seeds = [];
      await expect(useCase.execute()).resolves.toEqual({
        upserted: [],
        deleted: [],
      });

      expect(articles.articles.get(admin.id)?.title).toBe('Sửa');
      expect(storage.uploaded.size).toBe(0);
      expect(logger.entries).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          meta: { code: 'RICE_BLAST', origin },
        }),
      );
    },
  );

  it('skips a pack article whose slug is taken by an admin article', async () => {
    const { articles, logger, useCase } = setup();
    const admin = buildArticle({
      diseaseCode: 'RICE_BROWN_SPOT',
      origin: EArticleOrigin.ADMIN,
      editedBy: 'admin-1',
    });
    articles.articles.set(admin.id, admin);

    const output = await useCase.execute();

    expect(output.upserted).toEqual([]);
    expect(articles.articles.size).toBe(1);
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        meta: { code: 'RICE_BLAST', slug: 'benh-dao-on' },
      }),
    );
  });

  it('keeps an unpublished AI article hidden when the pack revises it', async () => {
    const { source, articles, useCase } = setup();
    await useCase.execute();
    const [article] = [...articles.articles.values()];
    article.unpublish();
    source.seeds = [buildArticleSeed({ title: 'Đạo ôn mới' })];

    await useCase.execute();

    const revised = articles.articles.get(article.id);
    expect(revised?.title).toBe('Đạo ôn mới');
    expect(revised?.isPublished).toBe(false);
  });
});
