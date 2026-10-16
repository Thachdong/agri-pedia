import {
  buildArticle,
  buildCrop,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { ListArticleCropsUseCase } from './list-article-crops.use-case';

describe('ListArticleCropsUseCase', () => {
  it('lists crops with articles, disabled ones included, by sortOrder', async () => {
    const knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop('RICE', true, { sortOrder: 1 }));
    knowledge.crops.set(
      'DURIAN',
      buildCrop('DURIAN', false, {
        slug: 'sau-rieng',
        nameVi: 'Sầu riêng',
        sortOrder: 2,
      }),
    );
    knowledge.crops.set('CORN', buildCrop('CORN', true, { sortOrder: 3 }));
    const articles = new InMemoryArticleRepository();
    for (const article of [
      buildArticle({ cropType: 'DURIAN', diseaseCode: 'DURIAN_A', slug: 'a' }),
      buildArticle(),
      buildArticle({ diseaseCode: 'RICE_B', slug: 'b' }),
    ]) {
      articles.articles.set(article.id, article);
    }

    const result = await new ListArticleCropsUseCase(
      articles,
      knowledge,
    ).execute();

    expect(result).toEqual({
      crops: [
        {
          code: 'RICE',
          slug: 'lua',
          nameVi: 'Lúa',
          diagnosisEnabled: true,
          articleCount: 2,
        },
        {
          code: 'DURIAN',
          slug: 'sau-rieng',
          nameVi: 'Sầu riêng',
          diagnosisEnabled: false,
          articleCount: 1,
        },
      ],
    });
  });
});
