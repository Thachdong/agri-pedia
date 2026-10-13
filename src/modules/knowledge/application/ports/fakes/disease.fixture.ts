import {
  Crop,
  Disease,
  EAgentType,
  EDiseaseCategory,
  EPlantPart,
  EVerification,
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

export function buildCrop(code = 'RICE', enabled = true): Crop {
  return Crop.restore({
    code,
    nameVi: code === 'RICE' ? 'Lúa' : code,
    enabled,
  });
}
