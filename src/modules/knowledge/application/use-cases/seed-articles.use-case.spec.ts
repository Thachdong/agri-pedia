import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryFileStorage } from '@shared/storage';
import {
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
  const useCase = new SeedArticlesUseCase(
    source,
    articles,
    knowledge,
    storage,
    new InMemoryUnitOfWork(),
  );
  return { source, articles, storage, useCase };
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
        linkChanged: true,
      },
    ]);
    expect((await articles.findAllForSeed()).map((a) => a.slug)).toEqual([
      'dao-on',
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
        { cropSlug: 'lua', slug: 'benh-dao-on', diseaseCode: 'RICE_BLAST' },
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
});
