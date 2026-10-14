import {
  Crop,
  Disease,
  ECropStage,
  EAgentType,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
  TCropProps,
  TDiseaseContent,
  TDiseaseProps,
} from '../../../domain';

const empty = { vn: [], en: [] };

/** Test helper: a disease with minimal content; override any prop. */
export function buildDisease(
  overrides: Partial<Omit<TDiseaseProps, 'content'>> & {
    content?: Partial<TDiseaseContent>;
  } = {},
): Disease {
  const { content, ...props } = overrides;
  return Disease.restore({
    code: 'RICE_BLAST',
    cropType: 'RICE',
    category: EDiseaseCategory.DISEASE,
    agentType: EAgentType.FUNGUS,
    nameVi: 'Bệnh đạo ôn',
    nameEn: 'Rice Blast',
    scientificName: null,
    aliasesVi: [],
    aliasesEn: [],
    affectedParts: [EPlantPart.LEAF],
    verification: EVerification.SOURCED,
    profile: { base: {} },
    kbVersion: '2026-10-12',
    ...props,
    content: {
      pathogens: empty,
      symptoms: empty,
      variants: [],
      transmissionMode: null,
      cropStages: [],
      favorableConditions: empty,
      treatments: { cultural: empty, biological: empty, nutrition: empty },
      similarDiseases: [],
      visualKeywords: [],
      references: [],
      ...content,
    },
  });
}

/** Test helper: a crop with a small rice-like configuration; override any prop. */
export function buildCrop(
  code = 'RICE',
  enabled = true,
  overrides: Partial<TCropProps> = {},
): Crop {
  return Crop.restore({
    code,
    nameVi: code === 'RICE' ? 'Lúa' : code,
    nameEn: code.toLowerCase(),
    enabled,
    kbVersion: '2026-10-12',
    sortOrder: 1,
    plantParts: [{ code: EPlantPart.LEAF, nameVi: 'Lá', promptEn: 'leaf' }],
    cropStages: [{ code: ECropStage.SEEDLING, nameVi: 'Mạ' }],
    features: {
      lesionShape: {
        level: 'region',
        values: ['SPINDLE_DIAMOND', 'NO_DISTINCT_LESION', 'UNSURE'],
      },
      plantForm: {
        level: 'image',
        values: ['NORMAL', 'STUNTED', 'UNSURE'],
        normal: ['NORMAL'],
      },
    },
    prompt: { subjectEn: 'rice plants', wholeImageCuesEn: 'stunting' },
    ...overrides,
  });
}
