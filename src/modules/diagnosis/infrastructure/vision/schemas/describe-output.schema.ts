import { z } from 'zod';
import { KNOWLEDGE_OBSERVATION_FEATURES as FEATURES } from '@modules/knowledge/contracts';
import { EPlantPart, TDescribeResult } from '../../../domain';

const box2d = z
  .array(z.number())
  .length(4)
  .describe('[ymin, xmin, ymax, xmax], each 0..1000 relative to the image');

/** B1 structured output; feature enums come from the knowledge base (one source with the scoring). */
export const describeOutputSchema = z.object({
  isTargetCrop: z.enum(['YES', 'NO', 'UNSURE']),
  quality: z.enum(['GOOD', 'BLURRY', 'TOO_FAR', 'TOO_DARK']),
  detectedPart: z.enum([
    EPlantPart.LEAF,
    EPlantPart.SHEATH,
    EPlantPart.STEM,
    EPlantPart.PANICLE,
    EPlantPart.ROOT,
    EPlantPart.WHOLE_PLANT,
    'UNSURE',
  ]),
  wholeImage: z.object({
    discoloration: z.enum(FEATURES.discoloration.values),
    plantForm: z.enum(FEATURES.plantForm.values),
    panicle: z.enum(FEATURES.panicle.values),
    pestsVisible: z.enum(FEATURES.pestsVisible.values),
  }),
  regions: z.array(
    z.object({
      box_2d: box2d,
      lesionShape: z.enum(FEATURES.lesionShape.values),
      centerColor: z.enum(FEATURES.centerColor.values),
      borderColor: z.enum(FEATURES.borderColor.values),
      margin: z.enum(FEATURES.margin.values),
      halo: z.enum(FEATURES.halo.values),
      size: z.enum(FEATURES.size.values),
      distribution: z.enum(FEATURES.distribution.values),
      position: z.enum(FEATURES.position.values),
      sign: z.enum(FEATURES.sign.values),
      deformation: z.enum(FEATURES.deformation.values),
      descriptionEn: z.string(),
      descriptionVi: z.string(),
    }),
  ),
});

export type TDescribeOutputSchema = z.infer<typeof describeOutputSchema>;

/** Model output -> domain result: box_2d (0..1000, y first) -> box (0..1, top-left + size). */
export function toDescribeResult(
  output: TDescribeOutputSchema,
): TDescribeResult {
  return {
    isTargetCrop: output.isTargetCrop,
    quality: output.quality,
    detectedPart: output.detectedPart,
    wholeImage: { ...output.wholeImage },
    regions: output.regions.map(
      ({ box_2d, descriptionEn, descriptionVi, ...observations }) => {
        const [ymin, xmin, ymax, xmax] = box_2d.map((v) => v / 1000);
        return {
          box: { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin },
          observations: { ...observations },
          descriptionEn,
          descriptionVi,
        };
      },
    ),
  };
}
