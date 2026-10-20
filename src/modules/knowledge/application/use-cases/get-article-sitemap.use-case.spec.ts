import { EArticleStatus } from '../../domain';
import {
  buildArticle,
  buildCrop,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { GetArticleSitemapUseCase } from './get-article-sitemap.use-case';

describe('GetArticleSitemapUseCase', () => {
  it('lists REVIEWED articles and the latest update per crop', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop('RICE'));
    knowledge.crops.set(
      'DURIAN',
      buildCrop('DURIAN', false, { slug: 'sau-rieng', sortOrder: 2 }),
    );
    const articles = new InMemoryArticleRepository();
    for (const article of [
      buildArticle({ updatedAt: new Date('2026-10-10') }),
      buildArticle({
        diseaseCode: 'RICE_B',
        slug: 'b',
        updatedAt: new Date('2026-10-12'),
      }),
      buildArticle({
        cropType: 'DURIAN',
        diseaseCode: 'DURIAN_X',
        slug: 'x',
        status: EArticleStatus.DRAFT,
        reviewedBy: null,
        reviewedAt: null,
      }),
    ]) {
      articles.articles.set(article.id, article);
    }

    const result = await new GetArticleSitemapUseCase(
      articles,
      knowledge,
    ).execute();

    expect(result).toEqual({
      crops: [{ slug: 'lua', updatedAt: new Date('2026-10-12') }],
      articles: [
        { path: '/benh-cay-trong/lua/b', updatedAt: new Date('2026-10-12') },
        {
          path: '/benh-cay-trong/lua/benh-dao-on',
          updatedAt: new Date('2026-10-10'),
        },
      ],
    });
  });

  it('leaves out unpublished articles', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop('RICE'));
    const articles = new InMemoryArticleRepository();
    const hidden = buildArticle();
    hidden.unpublish();
    articles.articles.set(hidden.id, hidden);

    const result = await new GetArticleSitemapUseCase(
      articles,
      knowledge,
    ).execute();

    expect(result).toEqual({ crops: [], articles: [] });
  });
});
