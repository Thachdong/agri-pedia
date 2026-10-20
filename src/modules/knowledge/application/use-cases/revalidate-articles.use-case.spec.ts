import { Article, EArticleOrigin, EArticleStatus } from '../../domain';
import {
  buildCrop,
  buildDisease,
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
  return { articles, knowledge, invalidator, useCase };
}

/** Stores an article of RICE with this slug and body. */
function storeArticle(
  articles: InMemoryArticleRepository,
  slug: string,
  markdown: string,
  codes: { diseaseCode?: string; variantCode?: string } = {},
): void {
  const article = Article.restore(slug, {
    cropType: 'RICE',
    diseaseCode: codes.diseaseCode ?? `RICE_${slug.toUpperCase()}`,
    variantCode: codes.variantCode ?? null,
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
    origin: EArticleOrigin.AI,
    editedBy: null,
    isPublished: true,
  });
  articles.articles.set(article.id, article);
}

const blast = (overrides: Partial<TSeededArticle> = {}): TSeededArticle => ({
  cropSlug: 'lua',
  slug: 'benh-dao-on',
  oldSlug: null,
  diseaseCode: 'RICE_BLAST',
  variantCode: null,
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
        {
          cropSlug: 'lua',
          slug: 'benh-dao-on',
          diseaseCode: 'RICE_BLAST',
          variantCode: null,
        },
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

  it('sends the main article and the variant redirect when a variant article changed', async () => {
    const { articles, useCase } = setup();
    storeArticle(articles, 'benh-dao-on', '', { diseaseCode: 'RICE_BLAST' });
    storeArticle(articles, 'benh-dao-on-co-bong', '', {
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V2',
    });

    const { tags } = await useCase.execute({
      upserted: [
        blast({ slug: 'benh-dao-on-la', variantCode: 'RICE_BLAST__V1' }),
      ],
      deleted: [],
    });

    expect(tags).toEqual([
      'article-disease:RICE_BLAST__V1',
      'article:lua:benh-dao-on',
      'article:lua:benh-dao-on-la',
      'articles',
      'articles:lua',
    ]);
  });

  it('sends every variant article when the main article changed', async () => {
    const { articles, useCase } = setup();
    storeArticle(articles, 'benh-dao-on-la', '', {
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V1',
    });
    storeArticle(articles, 'benh-dao-on-co-bong', '', {
      diseaseCode: 'RICE_BLAST',
      variantCode: 'RICE_BLAST__V2',
    });

    const { tags } = await useCase.execute({
      upserted: [blast()],
      deleted: [],
    });

    expect(tags).toEqual(
      expect.arrayContaining([
        'article:lua:benh-dao-on-la',
        'article:lua:benh-dao-on-co-bong',
      ]),
    );
  });

  it('adds articles linking to a variant code when the main article it falls back to changed its link data', async () => {
    const { articles, knowledge, useCase } = setup();
    knowledge.diseases.set(
      'RICE_BLAST',
      buildDisease({
        content: {
          variants: [
            {
              code: 'RICE_BLAST__V2',
              names: {
                vn: 'Đạo ôn cổ bông',
                en: 'Neck blast',
                scientific: null,
              },
              affectedPart: { vn: 'Cổ bông', en: 'Neck' },
              symptoms: { vn: [], en: [] },
            },
          ],
        },
      }),
    );
    storeArticle(articles, 'dom-nau', '[Cổ bông](/diseases/RICE_BLAST__V2)');

    const { tags } = await useCase.execute({
      upserted: [blast({ linkChanged: true })],
      deleted: [],
    });

    expect(tags).toContain('article:lua:dom-nau');
  });
});
