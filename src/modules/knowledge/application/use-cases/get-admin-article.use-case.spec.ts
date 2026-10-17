import { InMemoryFileStorage } from '@shared/storage';
import {
  EArticleOrigin,
  KnowledgeAdminRequiredException,
  KnowledgeArticleCodeNotFoundException,
} from '../../domain';
import {
  ADMIN_ID,
  buildArticle,
  buildCrop,
  FARMER_ID,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
  stubUserQuery,
} from '../ports/fakes';
import { GetAdminArticleUseCase } from './get-admin-article.use-case';

const MARKDOWN =
  'Xem [đốm nâu](/diseases/RICE_BROWN_SPOT).\n\n![Vết](dao-on-1.webp)\n';

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  const articles = new InMemoryArticleRepository();
  const main = buildArticle({ markdown: MARKDOWN });
  const variant = buildArticle({
    variantCode: 'RICE_BLAST__V1',
    slug: 'benh-dao-on-la',
    origin: EArticleOrigin.AI_REVIEWED,
    editedBy: ADMIN_ID,
  });
  variant.unpublish();
  for (const article of [main, variant]) {
    articles.articles.set(article.id, article);
  }
  const useCase = new GetAdminArticleUseCase(
    stubUserQuery(),
    articles,
    knowledge,
    new InMemoryFileStorage(),
  );
  return { useCase };
}

describe('GetAdminArticleUseCase', () => {
  it('returns the stored content of the main article of a disease code', async () => {
    const { useCase } = setup();

    const article = await useCase.execute({
      userId: ADMIN_ID,
      code: 'RICE_BLAST',
    });

    expect(article).toMatchObject({
      code: 'RICE_BLAST',
      crop: { code: 'RICE', slug: 'lua' },
      diseaseCode: 'RICE_BLAST',
      variantCode: null,
      slug: 'benh-dao-on',
      path: '/benh-cay-trong/lua/benh-dao-on',
      markdown: MARKDOWN,
      cover: 'dao-on-1.webp',
      origin: EArticleOrigin.AI,
      isPublished: true,
      editedBy: null,
      sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
    });
    expect(article.images).toEqual([
      expect.objectContaining({
        file: 'dao-on-1.webp',
        url: 'https://storage.test/articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp',
        alt: 'Vết bệnh',
      }),
    ]);
  });

  it('returns an unpublished variant article by its variant code', async () => {
    const { useCase } = setup();

    const article = await useCase.execute({
      userId: ADMIN_ID,
      code: 'RICE_BLAST__V1',
    });

    expect(article).toMatchObject({
      variantCode: 'RICE_BLAST__V1',
      slug: 'benh-dao-on-la',
      origin: EArticleOrigin.AI_REVIEWED,
      isPublished: false,
      editedBy: ADMIN_ID,
    });
  });

  it('throws KnowledgeArticleCodeNotFound for a code without an article', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: ADMIN_ID, code: 'RICE_BLAST__V2' }),
    ).rejects.toBeInstanceOf(KnowledgeArticleCodeNotFoundException);
  });

  it('rejects a non-admin', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ userId: FARMER_ID, code: 'RICE_BLAST' }),
    ).rejects.toBeInstanceOf(KnowledgeAdminRequiredException);
  });
});
