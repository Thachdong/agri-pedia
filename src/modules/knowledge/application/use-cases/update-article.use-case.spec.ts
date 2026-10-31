import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import { InMemoryFileStorage } from '@shared/storage';
import {
  EArticleOrigin,
  KnowledgeAdminRequiredException,
  KnowledgeArticleCodeNotFoundException,
  KnowledgeArticleImageInvalidException,
  KnowledgeArticleInvalidContentException,
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
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';
import {
  TUpdateArticleInput,
  UpdateArticleUseCase,
} from './update-article.use-case';

const TMP = `tmp/${ADMIN_ID}/9a8b7c6d.jpg`;
const CREDIT = {
  source: 'Dataset',
  author: 'Tác giả',
  license: 'CC BY 4.0',
  url: 'https://example.test/dataset',
};
const SUMMARY =
  'Cách nhận biết bệnh đạo ôn và phòng trừ đúng lúc trên lúa ở từng giai đoạn.';

const input = (
  overrides: Partial<TUpdateArticleInput> = {},
): TUpdateArticleInput => ({
  userId: ADMIN_ID,
  code: 'RICE_BLAST',
  title: 'Bệnh đạo ôn trên lúa',
  summary: SUMMARY,
  markdown: '![Vết bệnh](dao-on-1.webp)\n\n![Cổ bông](co-bong.webp)\n',
  cover: 'dao-on-1.webp',
  images: [
    { file: 'dao-on-1.webp', alt: 'Vết bệnh mới', credit: CREDIT },
    { file: 'co-bong.webp', tmpKey: TMP, alt: 'Cổ bông', credit: CREDIT },
  ],
  sources: [{ title: 'IRRI', url: 'https://irri.org' }],
  ...overrides,
});

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  knowledge.diseases.set('RICE_BLAST', buildDisease({ code: 'RICE_BLAST' }));
  const articles = new InMemoryArticleRepository();
  const article = buildArticle();
  articles.articles.set(article.id, article);
  const publisher = new InMemoryArticleImagePublisher().upload(TMP);
  const storage = new InMemoryFileStorage();
  storage.files.add(TMP);
  const invalidator = new InMemoryArticleCacheInvalidator();
  const logger = new InMemoryLogger();
  const useCase = new UpdateArticleUseCase(
    stubUserQuery(),
    knowledge,
    articles,
    publisher,
    storage,
    new InMemoryUnitOfWork(),
    new RevalidateArticlesUseCase(articles, knowledge, invalidator),
    logger,
  );
  return {
    article,
    articles,
    publisher,
    storage,
    invalidator,
    logger,
    useCase,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('UpdateArticleUseCase', () => {
  it('replaces the content of an AI article, which becomes AI_REVIEWED', async () => {
    const { article, articles, storage, invalidator, useCase } = setup();

    const output = await useCase.execute(input());
    await flush();

    expect(output).toEqual({
      code: 'RICE_BLAST',
      slug: 'benh-dao-on',
      path: '/benh-cay-trong/lua/benh-dao-on',
      origin: EArticleOrigin.AI_REVIEWED,
    });
    const saved = articles.articles.get(article.id);
    expect(saved).toMatchObject({
      title: 'Bệnh đạo ôn trên lúa',
      slug: 'benh-dao-on',
      origin: EArticleOrigin.AI_REVIEWED,
      editedBy: ADMIN_ID,
      reviewedBy: ADMIN_ID,
      sources: [{ title: 'IRRI', url: 'https://irri.org' }],
    });
    expect(saved?.images).toEqual([
      expect.objectContaining({
        file: 'dao-on-1.webp',
        key: 'articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp',
        alt: 'Vết bệnh mới',
      }),
      expect.objectContaining({
        file: 'co-bong.webp',
        key: 'articles/RICE/RICE_BLAST/co-bong.fake0001.webp',
        width: 1200,
      }),
    ]);
    expect(storage.files.has(TMP)).toBe(false);
    expect(invalidator.calls).toEqual([
      expect.arrayContaining(['article:lua:benh-dao-on', 'articles:lua']),
    ]);
  });

  it('still saves the article when a TMP upload cannot be deleted', async () => {
    const { article, articles, storage, logger, useCase } = setup();
    jest
      .spyOn(storage, 'deleteFile')
      .mockRejectedValue(new Error('storage down'));

    await useCase.execute(input());

    expect(articles.articles.get(article.id)?.title).toBe(
      'Bệnh đạo ôn trên lúa',
    );
    expect(logger.entries).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        message: 'TMP upload not deleted',
        meta: { key: TMP, reason: 'Error: storage down' },
      }),
    );
  });

  it('edits an unpublished variant article by its variant code and keeps it hidden', async () => {
    const { articles, useCase } = setup();
    const variant = buildArticle({
      variantCode: 'RICE_BLAST__V1',
      slug: 'dao-on-la',
      origin: EArticleOrigin.ADMIN,
      editedBy: 'other-admin',
    });
    variant.unpublish();
    articles.articles.set(variant.id, variant);

    await useCase.execute(input({ code: 'RICE_BLAST__V1' }));

    expect(articles.articles.get(variant.id)).toMatchObject({
      title: 'Bệnh đạo ôn trên lúa',
      origin: EArticleOrigin.ADMIN,
      editedBy: ADMIN_ID,
      isPublished: false,
    });
  });

  it('drops stored images left out of the list', async () => {
    const { article, articles, useCase } = setup();

    await useCase.execute(
      input({
        markdown: 'Chỉ có chữ.\n',
        cover: 'co-bong.webp',
        images: [
          { file: 'co-bong.webp', tmpKey: TMP, alt: 'Cổ bông', credit: CREDIT },
        ],
      }),
    );

    expect(
      articles.articles.get(article.id)?.images.map((i) => i.file),
    ).toEqual(['co-bong.webp']);
  });

  it('throws KnowledgeArticleCodeNotFound for a code without an article', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(input({ code: 'RICE_BLAST__V2' })),
    ).rejects.toBeInstanceOf(KnowledgeArticleCodeNotFoundException);
  });

  it('rejects a non-admin', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(input({ userId: FARMER_ID })),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });

  it('rejects invalid content and changes nothing', async () => {
    const { article, articles, publisher, useCase } = setup();

    await expect(
      useCase.execute(input({ markdown: '[x](/diseases/RICE_NOPE)' })),
    ).rejects.toBeInstanceOf(KnowledgeArticleInvalidContentException);
    expect(publisher.published).toEqual([]);
    expect(articles.articles.get(article.id)?.origin).toBe(EArticleOrigin.AI);
  });

  it('rejects a kept image the article does not have', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(
        input({
          markdown: 'x',
          cover: 'khac.webp',
          images: [{ file: 'khac.webp', alt: 'a', credit: CREDIT }],
        }),
      ),
    ).rejects.toBeInstanceOf(KnowledgeArticleImageInvalidException);
  });
});
