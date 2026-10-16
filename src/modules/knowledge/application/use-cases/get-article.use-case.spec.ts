import { InMemoryFileStorage } from '@shared/storage';
import {
  KnowledgeArticleNotFoundException,
  KnowledgeCropNotFoundException,
} from '../../domain';
import {
  buildArticle,
  buildCrop,
  buildDisease,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { GetArticleUseCase } from './get-article.use-case';

const MARKDOWN = [
  'Mở đầu',
  '',
  '![Vết bệnh](dao-on-1.webp)',
  '',
  '| [Đốm nâu](/diseases/RICE_BROWN_SPOT) | [Đốm gạch](/diseases/RICE_NARROW) |',
  '',
  '::disease-card{code="RICE_NARROW"}',
].join('\n');

function setup() {
  const knowledge = new InMemoryKnowledgeRepository();
  knowledge.crops.set('RICE', buildCrop('RICE'));
  const blast = buildDisease({ code: 'RICE_BLAST' });
  knowledge.diseases.set(
    'RICE_BLAST',
    buildDisease({
      code: 'RICE_BLAST',
      content: {
        ...blast.content,
        similarDiseases: [
          { code: 'RICE_BROWN_SPOT', distinguishingFeature: null },
        ],
      },
    }),
  );
  knowledge.diseases.set(
    'RICE_BROWN_SPOT',
    buildDisease({ code: 'RICE_BROWN_SPOT', nameVi: 'Bệnh đốm nâu' }),
  );
  knowledge.diseases.set(
    'RICE_NARROW',
    buildDisease({ code: 'RICE_NARROW', nameVi: 'Bệnh đốm gạch' }),
  );
  const articles = new InMemoryArticleRepository();
  for (const article of [
    buildArticle({ markdown: MARKDOWN }),
    buildArticle({
      diseaseCode: 'RICE_BROWN_SPOT',
      slug: 'benh-dom-nau',
      cover: null,
    }),
  ]) {
    articles.articles.set(article.id, article);
  }
  const useCase = new GetArticleUseCase(
    articles,
    knowledge,
    new InMemoryFileStorage(),
  );
  return { useCase };
}

const IMAGE_URL =
  'https://storage.test/articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp';

describe('GetArticleUseCase', () => {
  it('returns the article with resolved markdown, images and related diseases', async () => {
    const { useCase } = setup();

    const article = await useCase.execute({
      cropSlug: 'lua',
      slug: 'benh-dao-on',
    });

    expect(article.path).toBe('/benh-cay-trong/lua/benh-dao-on');
    expect(article.markdown).toBe(
      [
        'Mở đầu',
        '',
        `![Vết bệnh](${IMAGE_URL})`,
        '',
        '| [Đốm nâu](/benh-cay-trong/lua/benh-dom-nau) | Đốm gạch |',
        '',
        '::disease-card{code="RICE_NARROW"}',
      ].join('\n'),
    );
    expect(article.crop).toEqual({
      code: 'RICE',
      slug: 'lua',
      nameVi: 'Lúa',
      diagnosisEnabled: true,
    });
    expect(article.disease).toMatchObject({
      code: 'RICE_BLAST',
      verification: 'SOURCED',
    });
    expect(article.cover).toEqual({
      url: IMAGE_URL,
      alt: 'Vết bệnh',
      width: 800,
      height: 600,
    });
    expect(article.images).toEqual([
      expect.objectContaining({ url: IMAGE_URL, alt: 'Vết bệnh' }),
    ]);
    expect(article.relatedDiseases).toEqual([
      {
        code: 'RICE_NARROW',
        nameVi: 'Bệnh đốm gạch',
        category: 'DISEASE',
        path: null,
        coverUrl: null,
      },
      {
        code: 'RICE_BROWN_SPOT',
        nameVi: 'Bệnh đốm nâu',
        category: 'DISEASE',
        path: '/benh-cay-trong/lua/benh-dom-nau',
        coverUrl: null,
      },
    ]);
    expect(article).toMatchObject({
      status: 'REVIEWED',
      reviewedBy: 'AI',
      sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
    });
  });

  it('throws KnowledgeCropNotFound for an unknown crop slug', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ cropSlug: 'ngo', slug: 'benh-dao-on' }),
    ).rejects.toBeInstanceOf(KnowledgeCropNotFoundException);
  });

  it('throws KnowledgeArticleNotFound for an unknown slug', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ cropSlug: 'lua', slug: 'khong-co' }),
    ).rejects.toBeInstanceOf(KnowledgeArticleNotFoundException);
  });
});
