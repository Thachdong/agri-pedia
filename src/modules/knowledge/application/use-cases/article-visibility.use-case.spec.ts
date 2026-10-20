import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryLogger } from '@shared/logger';
import {
  KnowledgeAdminRequiredException,
  KnowledgeArticleCodeNotFoundException,
} from '../../domain';
import {
  ADMIN_ID,
  buildArticle,
  buildCrop,
  FARMER_ID,
  InMemoryArticleCacheInvalidator,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
  stubUserQuery,
} from '../ports/fakes';
import { PublishArticleUseCase } from './publish-article.use-case';
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';
import { UnpublishArticleUseCase } from './unpublish-article.use-case';

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  const articles = new InMemoryArticleRepository();
  const article = buildArticle();
  articles.articles.set(article.id, article);
  const invalidator = new InMemoryArticleCacheInvalidator();
  const deps = [
    stubUserQuery(),
    articles,
    knowledge,
    new InMemoryUnitOfWork(),
    new RevalidateArticlesUseCase(articles, knowledge, invalidator),
    new InMemoryLogger(),
  ] as const;
  return {
    article,
    articles,
    invalidator,
    unpublish: new UnpublishArticleUseCase(...deps),
    publish: new PublishArticleUseCase(...deps),
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('UnpublishArticleUseCase / PublishArticleUseCase', () => {
  it('hides and shows the article again, revalidating each change', async () => {
    const { article, articles, invalidator, unpublish, publish } = setup();

    await expect(
      unpublish.execute({ userId: ADMIN_ID, code: 'RICE_BLAST' }),
    ).resolves.toEqual({ code: 'RICE_BLAST', isPublished: false });
    await flush();
    expect(articles.articles.get(article.id)?.isPublished).toBe(false);
    expect(
      await articles.findPublishedBySlug('RICE', 'benh-dao-on'),
    ).toBeNull();

    await expect(
      publish.execute({ userId: ADMIN_ID, code: 'RICE_BLAST' }),
    ).resolves.toEqual({ code: 'RICE_BLAST', isPublished: true });
    await flush();
    expect(articles.articles.get(article.id)?.isPublished).toBe(true);
    expect(invalidator.calls).toHaveLength(2);
    expect(invalidator.calls[0]).toEqual(
      expect.arrayContaining([
        'articles',
        'articles:lua',
        'article:lua:benh-dao-on',
        'article-disease:RICE_BLAST',
      ]),
    );
  });

  it('is a no-op when the article is already in that state', async () => {
    const { invalidator, publish } = setup();

    await expect(
      publish.execute({ userId: ADMIN_ID, code: 'RICE_BLAST' }),
    ).resolves.toEqual({ code: 'RICE_BLAST', isPublished: true });
    await flush();
    expect(invalidator.calls).toEqual([]);
  });

  it('throws KnowledgeArticleCodeNotFound for a code without an article', async () => {
    const { unpublish } = setup();

    await expect(
      unpublish.execute({ userId: ADMIN_ID, code: 'RICE_BPH' }),
    ).rejects.toBeInstanceOf(KnowledgeArticleCodeNotFoundException);
  });

  it('rejects a non-admin', async () => {
    const { unpublish, publish } = setup();

    await expect(
      unpublish.execute({ userId: FARMER_ID, code: 'RICE_BLAST' }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
    await expect(
      publish.execute({ userId: FARMER_ID, code: 'RICE_BLAST' }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });
});
