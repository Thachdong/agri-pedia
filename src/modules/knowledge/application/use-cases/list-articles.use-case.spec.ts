import { InMemoryFileStorage } from '@shared/storage';
import {
  EDiseaseCategory,
  KnowledgeArticleInvalidCursorException,
  KnowledgeCropNotFoundException,
} from '../../domain';
import {
  buildArticle,
  buildCrop,
  buildDisease,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { ListArticlesUseCase } from './list-articles.use-case';

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  knowledge.diseases.set('RICE_BLAST', buildDisease({ code: 'RICE_BLAST' }));
  knowledge.diseases.set(
    'RICE_BPH',
    buildDisease({
      code: 'RICE_BPH',
      nameVi: 'Rầy nâu',
      category: EDiseaseCategory.PEST,
    }),
  );
  const articles = new InMemoryArticleRepository();
  const store = (...list: ReturnType<typeof buildArticle>[]) =>
    list.forEach((a) => articles.articles.set(a.id, a));
  const useCase = new ListArticlesUseCase(
    articles,
    knowledge,
    new InMemoryFileStorage(),
  );
  return { store, useCase };
}

describe('ListArticlesUseCase', () => {
  it('lists summaries of the crop by title with disease and cover URL', async () => {
    const { store, useCase } = setup();
    store(
      buildArticle({ title: 'Đạo ôn' }),
      buildArticle({
        diseaseCode: 'RICE_BPH',
        slug: 'ray-nau',
        title: 'Bệnh rầy nâu',
        cover: null,
      }),
      buildArticle({ cropType: 'DURIAN', diseaseCode: 'DURIAN_X', slug: 'x' }),
    );

    const result = await useCase.execute({ crop: 'lua', limit: 50 });

    expect(result.crop).toEqual({
      code: 'RICE',
      slug: 'lua',
      nameVi: 'Lúa',
      diagnosisEnabled: true,
    });
    expect(result.articles).toEqual([
      expect.objectContaining({
        path: '/benh-cay-trong/lua/ray-nau',
        title: 'Bệnh rầy nâu',
        coverUrl: null,
        disease: {
          code: 'RICE_BPH',
          nameVi: 'Rầy nâu',
          scientificName: null,
          category: 'PEST',
        },
      }),
      expect.objectContaining({
        path: '/benh-cay-trong/lua/benh-dao-on',
        status: 'REVIEWED',
        coverUrl:
          'https://storage.test/public/articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp',
      }),
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it('filters by the category of the disease', async () => {
    const { store, useCase } = setup();
    store(
      buildArticle(),
      buildArticle({ diseaseCode: 'RICE_BPH', slug: 'ray-nau' }),
    );

    const result = await useCase.execute({
      crop: 'lua',
      category: EDiseaseCategory.PEST,
      limit: 50,
    });

    expect(result.articles.map((a) => a.slug)).toEqual(['ray-nau']);
  });

  it('pages with a cursor until the last page', async () => {
    const { store, useCase } = setup();
    store(
      buildArticle({ diseaseCode: 'A', slug: 'a', title: 'A' }),
      buildArticle({ diseaseCode: 'B', slug: 'b', title: 'B' }),
      buildArticle({ diseaseCode: 'C', slug: 'c', title: 'C' }),
    );

    const first = await useCase.execute({ crop: 'lua', limit: 2 });
    const second = await useCase.execute({
      crop: 'lua',
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });

    expect(first.articles.map((a) => a.slug)).toEqual(['a', 'b']);
    expect(first.nextCursor).not.toBeNull();
    expect(second.articles.map((a) => a.slug)).toEqual(['c']);
    expect(second.nextCursor).toBeNull();
  });

  it('throws KnowledgeCropNotFound for an unknown crop slug', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ crop: 'ngo', limit: 50 }),
    ).rejects.toBeInstanceOf(KnowledgeCropNotFoundException);
  });

  it('throws KnowledgeArticleInvalidCursor for a malformed cursor', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ crop: 'lua', limit: 50, cursor: 'not-a-cursor' }),
    ).rejects.toBeInstanceOf(KnowledgeArticleInvalidCursorException);
  });
});
