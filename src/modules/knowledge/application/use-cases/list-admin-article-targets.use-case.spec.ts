import {
  EArticleOrigin,
  EDiseaseCategory,
  KnowledgeAdminRequiredException,
  KnowledgeCropNotFoundException,
} from '../../domain';
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
import { ListAdminArticleTargetsUseCase } from './list-admin-article-targets.use-case';

const variant = (code: string, name: string) => ({
  code,
  names: { vn: name, en: name, scientific: null },
  affectedPart: { vn: 'Lá', en: 'Leaf' },
  symptoms: { vn: [], en: [] },
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
          variant('RICE_BLAST__V2', 'Đạo ôn cổ bông'),
          variant('RICE_BLAST__V1', 'Đạo ôn lá'),
        ],
      },
    }),
  );
  knowledge.diseases.set(
    'RICE_BPH',
    buildDisease({
      code: 'RICE_BPH',
      nameVi: 'Rầy nâu',
      category: EDiseaseCategory.PEST,
    }),
  );
  knowledge.diseases.set(
    'DURIAN_X',
    buildDisease({ code: 'DURIAN_X', cropType: 'DURIAN', nameVi: 'Xì mủ' }),
  );
  const articles = new InMemoryArticleRepository();
  const main = buildArticle({ updatedAt: new Date('2026-10-16') });
  const hiddenVariant = buildArticle({
    variantCode: 'RICE_BLAST__V1',
    slug: 'benh-dao-on-la',
    title: 'Đạo ôn lá',
    origin: EArticleOrigin.AI_REVIEWED,
    editedBy: ADMIN_ID,
    updatedAt: new Date('2026-10-18'),
  });
  hiddenVariant.unpublish();
  for (const article of [main, hiddenVariant]) {
    articles.articles.set(article.id, article);
  }
  const useCase = new ListAdminArticleTargetsUseCase(
    stubUserQuery([
      { userId: 'pending-admin', role: 'ADMIN', isActive: false },
    ]),
    knowledge,
    articles,
  );
  return { useCase };
}

describe('ListAdminArticleTargetsUseCase', () => {
  it('lists diseases by name, each followed by its variants, with their articles', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ userId: ADMIN_ID, cropSlug: 'lua' });

    expect(result.crop).toEqual({ code: 'RICE', slug: 'lua', nameVi: 'Lúa' });
    expect(result.targets).toEqual([
      {
        code: 'RICE_BLAST',
        diseaseCode: 'RICE_BLAST',
        variantCode: null,
        nameVi: 'Bệnh đạo ôn',
        category: EDiseaseCategory.DISEASE,
        article: {
          slug: 'benh-dao-on',
          title: 'Bệnh đạo ôn lúa',
          path: '/benh-cay-trong/lua/benh-dao-on',
          origin: EArticleOrigin.AI,
          isPublished: true,
          status: 'REVIEWED',
          editedBy: null,
          updatedAt: new Date('2026-10-16'),
        },
      },
      expect.objectContaining({
        code: 'RICE_BLAST__V2',
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V2',
        nameVi: 'Đạo ôn cổ bông',
        article: null,
      }),
      expect.objectContaining({
        code: 'RICE_BLAST__V1',
        nameVi: 'Đạo ôn lá',
        article: expect.objectContaining({
          slug: 'benh-dao-on-la',
          origin: EArticleOrigin.AI_REVIEWED,
          isPublished: false,
          editedBy: ADMIN_ID,
        }),
      }),
      expect.objectContaining({
        code: 'RICE_BPH',
        category: EDiseaseCategory.PEST,
        article: null,
      }),
    ]);
  });

  it.each([
    ['a farmer', FARMER_ID],
    ['an inactive admin', 'pending-admin'],
    ['an unknown user', 'missing'],
  ])('rejects %s', async (_name, userId) => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId, cropSlug: 'lua' }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });

  it('throws KnowledgeCropNotFound for an unknown crop slug', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: ADMIN_ID, cropSlug: 'ngo' }),
    ).rejects.toBeInstanceOf(KnowledgeCropNotFoundException);
  });
});
