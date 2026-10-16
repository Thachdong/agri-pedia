import { EAgentType } from '../enums/agent-type.enum';
import { EDiseaseCategory } from '../enums/disease-category.enum';
import { EPlantPart } from '../enums/plant-part.enum';
import { EVerification } from '../enums/verification.enum';
import {
  Disease,
  diseaseCodeOf,
  TDiseaseContent,
  TDiseaseProps,
} from './disease.entity';

const empty = { vn: [], en: [] };

function content(overrides: Partial<TDiseaseContent> = {}): TDiseaseContent {
  return {
    pathogens: empty,
    symptoms: { vn: ['Vết hình thoi'], en: ['Spindle-shaped lesions'] },
    variants: [],
    transmissionMode: null,
    cropStages: [],
    favorableConditions: empty,
    treatments: { cultural: empty, biological: empty, nutrition: empty },
    similarDiseases: [],
    visualKeywords: ['spindle shape'],
    references: [],
    ...overrides,
  };
}

function disease(overrides: Partial<TDiseaseProps> = {}): Disease {
  return Disease.restore({
    code: 'RICE_BLAST',
    cropType: 'RICE',
    category: EDiseaseCategory.DISEASE,
    agentType: EAgentType.FUNGUS,
    nameVi: 'Bệnh đạo ôn',
    nameEn: 'Rice Blast',
    scientificName: 'Pyricularia oryzae',
    aliasesVi: ['Cháy lá'],
    aliasesEn: [],
    affectedParts: [EPlantPart.LEAF, EPlantPart.PANICLE],
    verification: EVerification.SOURCED,
    profile: { base: { halo: { YELLOW: -1 } } },
    content: content(),
    kbVersion: '2026-10-12',
    ...overrides,
  });
}

const blastVariants = [
  {
    code: 'RICE_BLAST__V1',
    names: { vn: 'Đạo ôn lá', en: 'Leaf Blast', scientific: null },
    affectedPart: { vn: 'Lá', en: 'Leaf' },
    symptoms: { vn: [], en: ['Gray-white center'] },
  },
  {
    code: 'RICE_BLAST__V2',
    names: { vn: 'Đạo ôn cổ bông', en: 'Neck Blast', scientific: null },
    affectedPart: { vn: 'Cổ bông', en: 'Neck' },
    symptoms: { vn: [], en: ['Neck rot'] },
  },
];

describe('diseaseCodeOf', () => {
  it('strips the variant suffix', () => {
    expect(diseaseCodeOf('RICE_BLAST__V1')).toBe('RICE_BLAST');
    expect(diseaseCodeOf('RICE_BLAST')).toBe('RICE_BLAST');
  });
});

describe('Disease.matchesQuery', () => {
  it('matches names and aliases ignoring case and diacritics', () => {
    const d = disease();
    expect(d.matchesQuery('DAO ON')).toBe(true);
    expect(d.matchesQuery('chay la')).toBe(true);
    expect(d.matchesQuery('blast')).toBe(true);
    expect(d.matchesQuery('bạc lá')).toBe(false);
  });
});

describe('Disease.isCandidateFor', () => {
  it('accepts an affected part, any part when null, and whole-plant entries', () => {
    expect(disease().isCandidateFor(EPlantPart.LEAF)).toBe(true);
    expect(disease().isCandidateFor(null)).toBe(true);
    expect(disease().isCandidateFor(EPlantPart.ROOT)).toBe(false);
    expect(
      disease({ affectedParts: [EPlantPart.WHOLE_PLANT] }).isCandidateFor(
        EPlantPart.ROOT,
      ),
    ).toBe(true);
  });

  it('rejects GEMINI_ONLY entries and entries without profile', () => {
    expect(
      disease({ verification: EVerification.GEMINI_ONLY }).isCandidateFor(null),
    ).toBe(false);
    expect(disease({ profile: null }).isCandidateFor(null)).toBe(false);
  });

  it('keeps SECONDARY entries as candidates', () => {
    expect(
      disease({ verification: EVerification.SECONDARY }).isCandidateFor(null),
    ).toBe(true);
  });
});

describe('Disease.scoringUnits', () => {
  it('scores the entry itself when it has no variants', () => {
    expect(disease().scoringUnits()).toEqual([
      {
        diseaseCode: 'RICE_BLAST',
        variantCode: null,
        weights: { halo: { YELLOW: -1 } },
      },
    ]);
  });

  it('scores each variant as base overridden per (feature, value)', () => {
    const d = disease({
      content: content({ variants: blastVariants }),
      profile: {
        base: { centerColor: { GRAY_WHITE: 2 }, halo: { YELLOW: -1 } },
        variants: {
          RICE_BLAST__V2: {
            centerColor: { GRAY_WHITE: 0, DARK_BROWN_BLACK: 2 },
          },
        },
      },
    });

    expect(d.scoringUnits()).toEqual([
      {
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V1',
        weights: { centerColor: { GRAY_WHITE: 2 }, halo: { YELLOW: -1 } },
      },
      {
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V2',
        weights: {
          centerColor: { GRAY_WHITE: 0, DARK_BROWN_BLACK: 2 },
          halo: { YELLOW: -1 },
        },
      },
    ]);
  });

  it('has no units without a profile', () => {
    expect(disease({ profile: null }).scoringUnits()).toEqual([]);
  });
});

describe('Disease.card', () => {
  const d = disease({
    content: content({
      variants: blastVariants,
      similarDiseases: [
        {
          code: 'RICE_BROWN_SPOT',
          distinguishingFeature: {
            vn: 'Đốm nâu tròn',
            en: 'Brown spot is oval',
          },
        },
        { code: 'RICE_NARROW_BROWN_SPOT', distinguishingFeature: null },
        {
          code: 'RICE_BACTERIAL_BLIGHT',
          distinguishingFeature: { vn: '...', en: 'Blight is a streak' },
        },
      ],
    }),
  });

  it('builds the variant card with parent + variant symptoms and only candidate differences', () => {
    expect(
      d.card('RICE_BLAST__V1', [
        'RICE_BLAST',
        'RICE_BROWN_SPOT',
        'RICE_NARROW_BROWN_SPOT',
      ]),
    ).toEqual({
      code: 'RICE_BLAST__V1',
      name: 'Leaf Blast',
      symptoms: ['Spindle-shaped lesions', 'Gray-white center'],
      visualKeywords: ['spindle shape'],
      distinguishFrom: [
        { code: 'RICE_BROWN_SPOT', feature: 'Brown spot is oval' },
      ],
    });
  });

  it('builds the entry card for the disease code', () => {
    expect(d.card('RICE_BLAST', [])).toMatchObject({
      code: 'RICE_BLAST',
      name: 'Rice Blast',
      symptoms: ['Spindle-shaped lesions'],
      distinguishFrom: [],
    });
  });

  it('returns null for an unknown variant', () => {
    expect(d.card('RICE_BLAST__V9', [])).toBeNull();
  });
});
