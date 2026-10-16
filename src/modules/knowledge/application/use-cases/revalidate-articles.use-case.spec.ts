import { Article, EArticleStatus } from '../../domain';
import {
  buildCrop,
  InMemoryArticleCacheInvalidator,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { RevalidateArticlesUseCase } from './revalidate-articles.use-case';
import { TSeededArticle } from './seed-articles.use-case';

function setup() {
  const articles = new InMemoryArticleRepository();
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  const invalidator = new InMemoryArticleCacheInvalidator();
  const useCase = new RevalidateArticlesUseCase(
    articles,
    knowledge,
    invalidator,
  );
  return { articles, invalidator, useCase };
}

/** Stores an article of RICE with this slug and body. */
function storeArticle(
  articles: InMemoryArticleRepository,
  slug: string,
  markdown: string,
): void {
  const article = Article.restore(slug, {
    cropType: 'RICE',
    diseaseCode: `RICE_${slug.toUpperCase()}`,
    slug,
    title: slug,
    summary: '',
    markdown,
    cover: null,
    images: [],
    sources: [],
    status: EArticleStatus.REVIEWED,
    reviewedBy: null,
    reviewedAt: null,
    kbVersion: '2026-10-12',
    contentHash: slug,
    publishedAt: new Date(),
    updatedAt: new Date(),
  });
  articles.articles.set(article.id, article);
}

const blast = (overrides: Partial<TSeededArticle> = {}): TSeededArticle => ({
  cropSlug: 'lua',
  slug: 'benh-dao-on',
  oldSlug: null,
  diseaseCode: 'RICE_BLAST',
  linkChanged: false,
  ...overrides,
});

describe('RevalidateArticlesUseCase', () => {
  it('does not call the client when nothing changed', async () => {
    const { invalidator, useCase } = setup();

    expect(await useCase.execute({ upserted: [], deleted: [] })).toEqual({
      tags: [],
    });
    expect(invalidator.calls).toEqual([]);
  });

  it('sends the article, crop list, global list and disease redirect tags', async () => {
    const { invalidator, useCase } = setup();

    const result = await useCase.execute({ upserted: [blast()], deleted: [] });

    expect(result.tags).toEqual([
      'article-disease:RICE_BLAST',
      'article:lua:benh-dao-on',
      'articles',
      'articles:lua',
    ]);
    expect(invalidator.calls).toEqual([result.tags]);
  });

  it('sends the old slug of a renamed article', async () => {
    const { useCase } = setup();

    const { tags } = await useCase.execute({
      upserted: [blast({ slug: 'dao-on', oldSlug: 'benh-dao-on' })],
      deleted: [],
    });

    expect(tags).toEqual(
      expect.arrayContaining(['article:lua:dao-on', 'article:lua:benh-dao-on']),
    );
  });

  it('adds articles linking to an article whose link data changed', async () => {
    const { articles, useCase } = setup();
    storeArticle(articles, 'dom-nau', '[Đạo ôn](/diseases/RICE_BLAST)');
    storeArticle(articles, 'dom-gach', '::disease-card{code="RICE_BLAST"}');
    storeArticle(articles, 'lem-lep', 'không nhắc tới');

    const { tags } = await useCase.execute({
      upserted: [blast({ linkChanged: true })],
      deleted: [],
    });

    expect(tags).toEqual(
      expect.arrayContaining(['article:lua:dom-nau', 'article:lua:dom-gach']),
    );
    expect(tags).not.toContain('article:lua:lem-lep');
  });

  it('does not look up linking articles when only the body changed', async () => {
    const { articles, useCase } = setup();
    storeArticle(articles, 'dom-nau', '[Đạo ôn](/diseases/RICE_BLAST)');

    const { tags } = await useCase.execute({
      upserted: [blast()],
      deleted: [],
    });

    expect(tags).not.toContain('article:lua:dom-nau');
  });

  it('treats a deleted article as a link change', async () => {
    const { articles, useCase } = setup();
    storeArticle(articles, 'dom-nau', '[Đạo ôn](/diseases/RICE_BLAST)');

    const { tags } = await useCase.execute({
      upserted: [],
      deleted: [
        { cropSlug: 'lua', slug: 'benh-dao-on', diseaseCode: 'RICE_BLAST' },
      ],
    });

    expect(tags).toEqual([
      'article-disease:RICE_BLAST',
      'article:lua:benh-dao-on',
      'article:lua:dom-nau',
      'articles',
      'articles:lua',
    ]);
  });
});
