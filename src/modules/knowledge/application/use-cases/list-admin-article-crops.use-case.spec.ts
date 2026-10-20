import { KnowledgeAdminRequiredException } from '../../domain';
import {
  ADMIN_ID,
  buildArticle,
  buildCrop,
  buildDisease,
  FARMER_ID,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
  stubUserQuery,
} from '../ports/fakes';
import { ListAdminArticleCropsUseCase } from './list-admin-article-crops.use-case';

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE', true, { sortOrder: 1 }));
  knowledge.crops.set(
    'CORN',
    buildCrop('CORN', false, { nameVi: 'Ngô', sortOrder: 2 }),
  );
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
  knowledge.diseases.set('RICE_BPH', buildDisease({ code: 'RICE_BPH' }));
  knowledge.diseases.set(
    'CORN_RUST',
    buildDisease({ code: 'CORN_RUST', cropType: 'CORN' }),
  );
  const articles = new InMemoryArticleRepository();
  const hidden = buildArticle({ diseaseCode: 'RICE_BPH', slug: 'ray-nau' });
  hidden.unpublish();
  for (const article of [buildArticle(), hidden]) {
    articles.articles.set(article.id, article);
  }
  return new ListAdminArticleCropsUseCase(stubUserQuery(), knowledge, articles);
}

describe('ListAdminArticleCropsUseCase', () => {
  it('lists every crop by sortOrder with KB entry and article counts', async () => {
    await expect(setup().execute({ userId: ADMIN_ID })).resolves.toEqual({
      crops: [
        {
          code: 'RICE',
          slug: 'lua',
          nameVi: 'Lúa',
          diagnosisEnabled: true,
          targetCount: 3,
          articleCount: 2,
          publishedCount: 1,
        },
        {
          code: 'CORN',
          slug: 'corn',
          nameVi: 'Ngô',
          diagnosisEnabled: false,
          targetCount: 1,
          articleCount: 0,
          publishedCount: 0,
        },
      ],
    });
  });

  it('rejects a non-admin', async () => {
    await expect(setup().execute({ userId: FARMER_ID })).rejects.toBeInstanceOf(
      KnowledgeAdminRequiredException,
    );
  });
});
