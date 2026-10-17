import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import {
  EArticleOrigin,
  EArticleStatus,
  KnowledgeAdminRequiredException,
  KnowledgeArticleAlreadyExistsException,
  KnowledgeArticleImageInvalidException,
  KnowledgeArticleInvalidContentException,
  KnowledgeArticleSlugTakenException,
  KnowledgeDiseaseNotFoundException,
} from '../../domain';
import {
  ADMIN_ID,
  buildArticle,
  buildCrop,
  buildDisease,
  FARMER_ID,
  InMemoryArticleCacheInvalidator,
  InMemoryArticleImagePublisher,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
  stubUserQuery,
} from '../ports/fakes';
import {
  CreateArticleUseCase,
  TCreateArticleInput,
} from './create-article.use-case';
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';

const TMP = `tmp/${ADMIN_ID}/1f2e3d4c.png`;
const CREDIT = {
  source: 'IRRI',
  author: 'Tác giả',
  license: 'CC BY 4.0',
  url: 'https://irri.test/a',
};

const input = (
  overrides: Partial<TCreateArticleInput> = {},
): TCreateArticleInput => ({
  userId: ADMIN_ID,
  code: 'RICE_BPH',
  slug: 'ray-nau',
  title: 'Rầy nâu hại lúa',
  summary:
    'Cách nhận biết rầy nâu, thời điểm phun và các biện pháp phòng trừ trên ruộng lúa.',
  markdown: 'Rầy nâu chích hút.\n\n![Rầy trên gốc](ray-nau-1.webp)\n',
  cover: 'ray-nau-1.webp',
  images: [
    {
      file: 'ray-nau-1.webp',
      tmpKey: TMP,
      alt: ' Rầy trên gốc ',
      credit: CREDIT,
    },
  ],
  sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
  ...overrides,
});

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  knowledge.diseases.set(
    'RICE_BLAST',
    buildDisease({
      code: 'RICE_BLAST',
      content: {
        variants: [
          {
            code: 'RICE_BLAST__V1',
            names: { vn: 'Đạo ôn lá', en: 'Leaf blast', scientific: null },
            affectedPart: { vn: 'Lá', en: 'Leaf' },
            symptoms: { vn: [], en: [] },
          },
        ],
      },
    }),
  );
  knowledge.diseases.set(
    'RICE_BPH',
    buildDisease({
      code: 'RICE_BPH',
      nameVi: 'Rầy nâu',
      kbVersion: '2026-10-15',
    }),
  );
  const articles = new InMemoryArticleRepository();
  const publisher = new InMemoryArticleImagePublisher().upload(TMP);
  const storage = new InMemoryFileStorage();
  storage.files.add(TMP);
  const invalidator = new InMemoryArticleCacheInvalidator();
  const useCase = new CreateArticleUseCase(
    stubUserQuery(),
    knowledge,
    articles,
    publisher,
    storage,
    new InMemoryUnitOfWork(),
    new RevalidateArticlesUseCase(articles, knowledge, invalidator),
    new InMemoryLogger(),
  );
  return { articles, publisher, storage, invalidator, useCase };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('CreateArticleUseCase', () => {
  it('creates a published ADMIN article with published images', async () => {
    const { articles, publisher, storage, invalidator, useCase } = setup();

    const output = await useCase.execute(input());
    await flush();

    expect(output).toEqual({
      code: 'RICE_BPH',
      slug: 'ray-nau',
      path: '/benh-cay-trong/lua/ray-nau',
    });
    const [article] = [...articles.articles.values()];
    expect(article).toMatchObject({
      cropType: 'RICE',
      diseaseCode: 'RICE_BPH',
      variantCode: null,
      origin: EArticleOrigin.ADMIN,
      isPublished: true,
      status: EArticleStatus.REVIEWED,
      reviewedBy: ADMIN_ID,
      editedBy: ADMIN_ID,
      kbVersion: '2026-10-15',
    });
    expect(article.images).toEqual([
      {
        file: 'ray-nau-1.webp',
        key: 'articles/RICE/RICE_BPH/ray-nau-1.fake0001.webp',
        width: 1200,
        height: 800,
        alt: 'Rầy trên gốc',
        caption: null,
        credit: CREDIT,
      },
    ]);
    expect(publisher.published).toEqual([
      { tmpKey: TMP, keyPrefix: 'articles/RICE/RICE_BPH/ray-nau-1' },
    ]);
    expect(storage.files.has(TMP)).toBe(false);
    expect(invalidator.calls).toEqual([
      expect.arrayContaining([
        'articles',
        'articles:lua',
        'article:lua:ray-nau',
        'article-disease:RICE_BPH',
      ]),
    ]);
  });

  it('creates a variant article when the main article exists', async () => {
    const { articles, useCase } = setup();
    const main = buildArticle();
    articles.articles.set(main.id, main);

    await useCase.execute(input({ code: 'RICE_BLAST__V1', slug: 'dao-on-la' }));

    expect(await articles.findByKbCode('RICE_BLAST__V1')).toMatchObject({
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V1',
      slug: 'dao-on-la',
    });
  });

  it('rejects a variant article without the main article', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(input({ code: 'RICE_BLAST__V1', slug: 'dao-on-la' })),
    ).rejects.toBeInstanceOf(KnowledgeArticleInvalidContentException);
  });

  it('rejects a non-admin', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(input({ userId: FARMER_ID })),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });

  it.each(['RICE_NOPE', 'RICE_BLAST__V9'])(
    'rejects the unknown KB code %s',
    async (code) => {
      const { useCase } = setup();

      await expect(useCase.execute(input({ code }))).rejects.toBeInstanceOf(
        KnowledgeDiseaseNotFoundException,
      );
    },
  );

  it('rejects a code that already has an article, even unpublished', async () => {
    const { articles, useCase } = setup();
    const existing = buildArticle({ diseaseCode: 'RICE_BPH', slug: 'ray' });
    existing.unpublish();
    articles.articles.set(existing.id, existing);

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      KnowledgeArticleAlreadyExistsException,
    );
  });

  it('rejects a slug used by another article of the crop', async () => {
    const { articles, useCase } = setup();
    const other = buildArticle({ slug: 'ray-nau' });
    articles.articles.set(other.id, other);

    await expect(useCase.execute(input())).rejects.toBeInstanceOf(
      KnowledgeArticleSlugTakenException,
    );
  });

  it('rejects invalid content before publishing any image', async () => {
    const { articles, publisher, useCase } = setup();

    await expect(
      useCase.execute(input({ slug: 'Rầy Nâu', cover: 'khac.webp' })),
    ).rejects.toMatchObject({
      code: 'KNOWLEDGE_ARTICLE_INVALID_CONTENT',
      details: {
        issues: [
          expect.stringMatching(/^slug must match/),
          'cover khac.webp is not listed in images',
        ],
      },
    });
    expect(publisher.published).toEqual([]);
    expect(articles.articles.size).toBe(0);
  });

  it.each<[string, TCreateArticleInput['images'][number]]>([
    [
      'an upload of another user',
      {
        file: 'ray-nau-1.webp',
        tmpKey: 'tmp/other/1.png',
        alt: 'a',
        credit: CREDIT,
      },
    ],
    [
      'a missing upload',
      {
        file: 'ray-nau-1.webp',
        tmpKey: `tmp/${ADMIN_ID}/missing.png`,
        alt: 'a',
        credit: CREDIT,
      },
    ],
    [
      'an image without upload',
      { file: 'ray-nau-1.webp', alt: 'a', credit: CREDIT },
    ],
  ])('rejects %s', async (_name, image) => {
    const { articles, useCase } = setup();

    await expect(
      useCase.execute(input({ images: [image] })),
    ).rejects.toBeInstanceOf(KnowledgeArticleImageInvalidException);
    expect(articles.articles.size).toBe(0);
  });
});
