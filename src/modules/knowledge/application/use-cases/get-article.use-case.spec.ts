import { InMemoryFileStorage } from '@shared/storage';
import {
  Article,
  KnowledgeArticleNotFoundException,
  TArticleContent,
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

/** Content of a stored article (to revise it in a test). */
function contentOf(article: Article): TArticleContent {
  return {
    cropType: article.cropType,
    diseaseCode: article.diseaseCode,
    variantCode: article.variantCode,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    markdown: article.markdown,
    cover: article.cover,
    images: article.images,
    sources: article.sources,
    status: article.status,
    reviewedBy: article.reviewedBy,
    reviewedAt: article.reviewedAt,
    kbVersion: article.kbVersion,
    contentHash: article.contentHash,
    updatedAt: article.updatedAt,
  };
}

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
  const variant = (code: string, name: string) => ({
    code,
    names: { vn: name, en: name, scientific: null },
    affectedPart: { vn: 'Lá', en: 'Leaf' },
    symptoms: { vn: [], en: [] },
  });
  knowledge.diseases.set(
    'RICE_BLAST',
    buildDisease({
      code: 'RICE_BLAST',
      content: {
        ...blast.content,
        variants: [
          variant('RICE_BLAST__V1', 'Đạo ôn lá'),
          variant('RICE_BLAST__V2', 'Đạo ôn cổ bông'),
          variant('RICE_BLAST__V3', 'Đạo ôn hạt'),
        ],
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
  return { articles, useCase };
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

  it('a main article lists its variant articles in KB order; variant links fall back to it', async () => {
    const { articles, useCase } = setup();
    for (const article of [
      buildArticle({
        variantCode: 'RICE_BLAST__V3',
        slug: 'benh-dao-on-hat',
        title: 'Đạo ôn hạt',
        cover: null,
      }),
      buildArticle({
        variantCode: 'RICE_BLAST__V1',
        slug: 'benh-dao-on-la',
        title: 'Đạo ôn lá',
      }),
    ]) {
      articles.articles.set(article.id, article);
    }
    const main = [...articles.articles.values()].find(
      (a) => a.slug === 'benh-dao-on',
    );
    main?.revise({
      ...contentOf(main),
      markdown:
        '[Lá](/diseases/RICE_BLAST__V1) [Cổ bông](/diseases/RICE_BLAST__V2)',
    });

    const article = await useCase.execute({
      cropSlug: 'lua',
      slug: 'benh-dao-on',
    });

    expect(article.variant).toBeNull();
    expect(article.parentArticle).toBeNull();
    expect(article.variantArticles).toEqual([
      {
        path: '/benh-cay-trong/lua/benh-dao-on-la',
        title: 'Đạo ôn lá',
        variantCode: 'RICE_BLAST__V1',
        variantName: 'Đạo ôn lá',
        coverUrl:
          'https://storage.test/articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp',
      },
      {
        path: '/benh-cay-trong/lua/benh-dao-on-hat',
        title: 'Đạo ôn hạt',
        variantCode: 'RICE_BLAST__V3',
        variantName: 'Đạo ôn hạt',
        coverUrl: null,
      },
    ]);
    // V1 has its own article; V2 has none and links to the main article
    expect(article.markdown).toBe(
      '[Lá](/benh-cay-trong/lua/benh-dao-on-la) [Cổ bông](/benh-cay-trong/lua/benh-dao-on)',
    );
  });

  it('a variant article shows its variant and the main article as parent', async () => {
    const { articles, useCase } = setup();
    const leaf = buildArticle({
      variantCode: 'RICE_BLAST__V1',
      slug: 'benh-dao-on-la',
      title: 'Đạo ôn lá',
    });
    articles.articles.set(leaf.id, leaf);

    const article = await useCase.execute({
      cropSlug: 'lua',
      slug: 'benh-dao-on-la',
    });

    expect(article.disease?.code).toBe('RICE_BLAST');
    expect(article.variant).toEqual({
      code: 'RICE_BLAST__V1',
      name: 'Đạo ôn lá',
      affectedParts: 'Lá',
    });
    expect(article.parentArticle).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      title: 'Bệnh đạo ôn lúa',
    });
    expect(article.variantArticles).toEqual([]);
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

  it('treats an unpublished article as missing, and links to it as plain text', async () => {
    const { articles, useCase } = setup();
    const brownSpot = [...articles.articles.values()].find(
      (a) => a.slug === 'benh-dom-nau',
    );
    brownSpot?.unpublish();

    await expect(
      useCase.execute({ cropSlug: 'lua', slug: 'benh-dom-nau' }),
    ).rejects.toBeInstanceOf(KnowledgeArticleNotFoundException);
    const article = await useCase.execute({
      cropSlug: 'lua',
      slug: 'benh-dao-on',
    });
    expect(article.markdown).toContain('| Đốm nâu | Đốm gạch |');
    expect(article.relatedDiseases).toContainEqual(
      expect.objectContaining({ code: 'RICE_BROWN_SPOT', path: null }),
    );
  });
});
