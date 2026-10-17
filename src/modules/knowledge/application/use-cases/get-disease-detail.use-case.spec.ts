import {
  EArticleStatus,
  KnowledgeDiseaseNotFoundException,
} from '../../domain';
import {
  buildArticle,
  buildCrop,
  buildDisease,
  InMemoryArticleRepository,
  InMemoryKnowledgeRepository,
} from '../ports/fakes';
import { GetDiseaseDetailUseCase } from './get-disease-detail.use-case';

describe('GetDiseaseDetailUseCase', () => {
  let knowledge: InMemoryKnowledgeRepository;
  let articles: InMemoryArticleRepository;
  let useCase: GetDiseaseDetailUseCase;

  beforeEach(() => {
    knowledge = new InMemoryKnowledgeRepository();
    knowledge.diseases.set(
      'RICE_BROWN_SPOT',
      buildDisease({ code: 'RICE_BROWN_SPOT', nameVi: 'Bệnh đốm nâu' }),
    );
    knowledge.diseases.set(
      'RICE_BLAST',
      buildDisease({
        code: 'RICE_BLAST',
        aliasesVi: ['Cháy lá'],
        content: {
          pathogens: { vn: ['Nấm'], en: ['Fungus'] },
          symptoms: { vn: ['Vết hình thoi'], en: ['Spindle'] },
          variants: [
            {
              code: 'RICE_BLAST__V1',
              names: { vn: 'Đạo ôn lá', en: 'Leaf Blast', scientific: null },
              affectedPart: { vn: 'Lá', en: 'Leaf' },
              symptoms: { vn: ['Tâm xám'], en: ['Gray center'] },
            },
          ],
          transmissionMode: { vn: ['Qua gió.', 'Qua hạt.'], en: [] },
          favorableConditions: { vn: ['Ẩm'], en: ['Humid'] },
          treatments: {
            cultural: { vn: ['Vệ sinh'], en: [] },
            biological: { vn: [], en: [] },
            nutrition: { vn: ['Bón kali'], en: [] },
          },
          similarDiseases: [
            {
              code: 'RICE_BROWN_SPOT',
              distinguishingFeature: { vn: 'Đốm tròn', en: 'Round' },
            },
            { code: 'RICE_UNKNOWN', distinguishingFeature: null },
          ],
          references: [{ title: 'IRRI', url: 'http://irri' }],
        },
      }),
    );
    articles = new InMemoryArticleRepository();
    useCase = new GetDiseaseDetailUseCase(knowledge, articles);
  });

  it('returns the Vietnamese content with similar disease names', async () => {
    expect(await useCase.execute({ code: 'RICE_BLAST' })).toEqual({
      code: 'RICE_BLAST',
      nameVi: 'Bệnh đạo ôn',
      nameEn: 'Rice Blast',
      scientificName: null,
      aliases: ['Cháy lá'],
      category: 'DISEASE',
      agentType: 'FUNGUS',
      affectedParts: ['LEAF'],
      pathogens: ['Nấm'],
      symptoms: ['Vết hình thoi'],
      variants: [
        {
          code: 'RICE_BLAST__V1',
          name: 'Đạo ôn lá',
          affectedParts: 'Lá',
          symptoms: ['Tâm xám'],
          article: null,
        },
      ],
      transmissionMode: 'Qua gió. Qua hạt.',
      cropStages: [],
      favorableConditions: ['Ẩm'],
      treatments: {
        cultural: ['Vệ sinh'],
        biological: [],
        nutrition: ['Bón kali'],
      },
      similarDiseases: [
        {
          code: 'RICE_BROWN_SPOT',
          name: 'Bệnh đốm nâu',
          distinguishingFeature: 'Đốm tròn',
        },
        {
          code: 'RICE_UNKNOWN',
          name: 'RICE_UNKNOWN',
          distinguishingFeature: null,
        },
      ],
      references: [{ title: 'IRRI', url: 'http://irri' }],
      verification: 'SOURCED',
      kbVersion: '2026-10-12',
      article: null,
    });
  });

  it('links the article of the disease', async () => {
    knowledge.crops.set('RICE', buildCrop('RICE'));
    const article = buildArticle({ status: EArticleStatus.DRAFT });
    articles.articles.set(article.id, article);

    const detail = await useCase.execute({ code: 'RICE_BLAST' });

    expect(detail.article).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      status: 'DRAFT',
    });
  });

  it('links the main article to the disease and a variant article to its variant', async () => {
    knowledge.crops.set('RICE', buildCrop('RICE'));
    for (const article of [
      buildArticle({
        variantCode: 'RICE_BLAST__V1',
        slug: 'benh-dao-on-la',
      }),
      buildArticle(),
    ]) {
      articles.articles.set(article.id, article);
    }

    const detail = await useCase.execute({ code: 'RICE_BLAST' });

    expect(detail.article).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on',
      status: 'REVIEWED',
    });
    expect(detail.variants[0].article).toEqual({
      path: '/benh-cay-trong/lua/benh-dao-on-la',
      status: 'REVIEWED',
    });
  });

  it('throws KnowledgeDiseaseNotFound for an unknown code', async () => {
    await expect(useCase.execute({ code: 'NOPE' })).rejects.toBeInstanceOf(
      KnowledgeDiseaseNotFoundException,
    );
  });

  it('links no article when the article is unpublished', async () => {
    knowledge.crops.set('RICE', buildCrop('RICE'));
    const article = buildArticle();
    article.unpublish();
    articles.articles.set(article.id, article);

    const detail = await useCase.execute({ code: 'RICE_BLAST' });

    expect(detail.article).toBeNull();
  });
});
