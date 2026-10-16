import { TKnowledgeDiagnosisCrop } from '@modules/knowledge/contracts';

/** Test helper: a rice-like diagnosis crop (knowledge contract shape); override any field. */
export function buildDiagnosisCrop(
  overrides: Partial<TKnowledgeDiagnosisCrop> = {},
): TKnowledgeDiagnosisCrop {
  return {
    code: 'RICE',
    nameEn: 'rice',
    enabled: true,
    kbVersion: '2026-10-12',
    plantParts: [
      { code: 'LEAF', promptEn: 'leaf' },
      { code: 'PANICLE', promptEn: 'panicle / grains' },
      { code: 'WHOLE_PLANT', promptEn: 'whole plant' },
    ],
    features: {
      lesionShape: {
        level: 'region',
        values: ['SPINDLE_DIAMOND', 'NO_DISTINCT_LESION', 'UNSURE'],
        descriptionEn: 'shape of the lesion',
        hintsEn: { SPINDLE_DIAMOND: 'pointed at both ends' },
      },
      distribution: {
        level: 'region',
        values: ['SCATTERED', 'WHOLE_ORGAN', 'UNSURE'],
      },
      plantForm: {
        level: 'image',
        values: ['NORMAL', 'STUNTED', 'UNSURE'],
        normal: ['NORMAL'],
        descriptionEn: 'plant shape',
      },
    },
    prompt: { subjectEn: 'rice plants', wholeImageCuesEn: 'stunting' },
    ...overrides,
  };
}
