import {
  buildCrop,
  buildDisease,
  InMemoryKnowledgeRepository,
} from '../../application/ports/fakes';
import { EPlantPart, EVerification } from '../../domain';
import { KnowledgeQueryService } from './knowledge-query.service';

const blastVariants = [
  {
    code: 'RICE_BLAST__V1',
    names: { vn: 'Đạo ôn lá', en: 'Leaf Blast', scientific: null },
    affectedPart: { vn: 'Lá', en: 'Leaf' },
    symptoms: { vn: [], en: ['Gray center'] },
  },
];

describe('KnowledgeQueryService', () => {
  let knowledge: InMemoryKnowledgeRepository;
  let service: KnowledgeQueryService;

  beforeEach(() => {
    knowledge = new InMemoryKnowledgeRepository();
    knowledge.crops.set('RICE', buildCrop());
    knowledge.crops.set('CORN', buildCrop('CORN', false));
    for (const disease of [
      buildDisease({
        code: 'RICE_BLAST',
        nameVi: 'Bệnh đạo ôn',
        profile: {
          base: { centerColor: { GRAY_WHITE: 2 } },
          variants: { RICE_BLAST__V1: { lesionShape: { SPINDLE_DIAMOND: 3 } } },
        },
        content: {
          variants: blastVariants,
          symptoms: { vn: [], en: ['Spindle'] },
          similarDiseases: [
            {
              code: 'RICE_BROWN_SPOT',
              distinguishingFeature: { vn: '', en: 'Brown spot is oval' },
            },
          ],
        },
      }),
      buildDisease({
        code: 'RICE_BROWN_SPOT',
        nameVi: 'Bệnh đốm nâu',
        nameEn: 'Brown Spot',
        profile: {
          base: { halo: { YELLOW: 2 }, centerColor: { GRAY_WHITE: 1 } },
        },
      }),
      buildDisease({
        code: 'RICE_ROOT_ROT',
        affectedParts: [EPlantPart.ROOT],
        profile: { base: { centerColor: { GRAY_WHITE: 5 } } },
      }),
      buildDisease({
        code: 'RICE_GEMINI',
        verification: EVerification.GEMINI_ONLY,
        profile: { base: { centerColor: { GRAY_WHITE: 5 } } },
      }),
    ]) {
      knowledge.diseases.set(disease.code, disease);
    }
    service = new KnowledgeQueryService(knowledge);
  });

  it('finds a crop with its status and KB version', async () => {
    expect(await service.findDiagnosisCrop('RICE')).toEqual({
      code: 'RICE',
      enabled: true,
      kbVersion: '2026-10-12',
    });
    expect(await service.findDiagnosisCrop('WHEAT')).toBeNull();
  });

  it('scores each region with whole-image observations, filtered by part and verification', async () => {
    const result = await service.findCandidates({
      cropType: 'RICE',
      part: 'LEAF',
      wholeImage: { centerColor: 'GRAY_WHITE' },
      regions: [{ lesionShape: 'SPINDLE_DIAMOND' }, { halo: 'YELLOW' }, {}],
      limit: 3,
    });

    expect(result[0].map((c) => [c.variantCode ?? c.diseaseCode])).toEqual([
      ['RICE_BLAST__V1'],
      ['RICE_BROWN_SPOT'],
    ]);
    expect(result[1][0].diseaseCode).toBe('RICE_BROWN_SPOT');
    expect(result[2].map((c) => c.diseaseCode)).toEqual([
      'RICE_BLAST',
      'RICE_BROWN_SPOT',
    ]);
    expect(result.flat().some((c) => c.diseaseCode === 'RICE_ROOT_ROT')).toBe(
      false,
    );
    expect(result.flat().some((c) => c.diseaseCode === 'RICE_GEMINI')).toBe(
      false,
    );
  });

  it('builds cards with differences limited to the requested codes', async () => {
    const cards = await service.getDiseaseCards([
      'RICE_BLAST__V1',
      'RICE_BROWN_SPOT',
      'UNKNOWN',
    ]);

    expect(cards.map((c) => c.code)).toEqual([
      'RICE_BLAST__V1',
      'RICE_BROWN_SPOT',
    ]);
    expect(cards[0]).toEqual({
      code: 'RICE_BLAST__V1',
      name: 'Leaf Blast',
      symptoms: ['Spindle', 'Gray center'],
      visualKeywords: [],
      distinguishFrom: [
        { code: 'RICE_BROWN_SPOT', feature: 'Brown spot is oval' },
      ],
    });
    expect(
      (await service.getDiseaseCards(['RICE_BLAST__V1']))[0].distinguishFrom,
    ).toEqual([]);
  });

  it('returns Vietnamese names of diseases and variants', async () => {
    expect(
      await service.getDiseaseNames([
        'RICE_BLAST__V1',
        'RICE_BROWN_SPOT',
        'RICE_BLAST__V9',
      ]),
    ).toEqual([
      {
        code: 'RICE_BLAST__V1',
        diseaseCode: 'RICE_BLAST',
        diseaseName: 'Bệnh đạo ôn',
        variantName: 'Đạo ôn lá',
        category: 'DISEASE',
      },
      {
        code: 'RICE_BROWN_SPOT',
        diseaseCode: 'RICE_BROWN_SPOT',
        diseaseName: 'Bệnh đốm nâu',
        variantName: null,
        category: 'DISEASE',
      },
    ]);
  });
});
