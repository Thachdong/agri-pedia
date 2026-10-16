import { z } from 'zod';
import { TKnowledgeDiagnosisCrop } from '@modules/knowledge/contracts';
import { TDescribeResult } from '../../../domain';

const box2d = z
  .array(z.number())
  .length(4)
  .describe('[ymin, xmin, ymax, xmax], each 0..1000 relative to the image');

/** B1 answer; feature fields depend on the crop. */
export type TDescribeOutputSchema = {
  isTargetCrop: 'YES' | 'NO' | 'UNSURE';
  quality: 'GOOD' | 'BLURRY' | 'TOO_FAR' | 'TOO_DARK';
  detectedPart: string;
  wholeImage: Record<string, string>;
  regions: Array<
    { box_2d: number[]; descriptionEn: string; descriptionVi: string } & Record<
      string,
      unknown
    >
  >;
};

function enumOf(values: string[]) {
  return z.enum(values as [string, ...string[]]);
}

/** Names of the crop's features at `level`, in profile order. */
function featureNames(
  crop: TKnowledgeDiagnosisCrop,
  level: 'region' | 'image',
): string[] {
  return Object.entries(crop.features)
    .filter(([, feature]) => feature.level === level)
    .map(([name]) => name);
}

function enumsOf(
  crop: TKnowledgeDiagnosisCrop,
  level: 'region' | 'image',
): Record<string, ReturnType<typeof enumOf>> {
  return Object.fromEntries(
    featureNames(crop, level).map((name) => [
      name,
      enumOf(crop.features[name].values),
    ]),
  );
}

/**
 * B1 structured output for photos of `crop`: `detectedPart` from the crop's parts, feature enums
 * from the crop's profile (one source with the scoring).
 */
export function buildDescribeOutputSchema(
  crop: TKnowledgeDiagnosisCrop,
): z.ZodType<TDescribeOutputSchema> {
  return z.object({
    isTargetCrop: z.enum(['YES', 'NO', 'UNSURE']),
    quality: z.enum(['GOOD', 'BLURRY', 'TOO_FAR', 'TOO_DARK']),
    detectedPart: enumOf([
      ...crop.plantParts.map((part) => part.code),
      'UNSURE',
    ]),
    wholeImage: z.object(enumsOf(crop, 'image')),
    regions: z.array(
      z.object({
        box_2d: box2d,
        ...enumsOf(crop, 'region'),
        descriptionEn: z.string(),
        descriptionVi: z.string(),
      }),
    ),
  }) as unknown as z.ZodType<TDescribeOutputSchema>;
}

/** Model output -> domain result: box_2d (0..1000, y first) -> box (0..1, top-left + size). */
export function toDescribeResult(
  output: TDescribeOutputSchema,
  crop: TKnowledgeDiagnosisCrop,
): TDescribeResult {
  const regionFeatures = featureNames(crop, 'region');
  return {
    isTargetCrop: output.isTargetCrop,
    quality: output.quality,
    detectedPart: output.detectedPart,
    wholeImage: { ...output.wholeImage },
    regions: output.regions.map((region) => {
      const [ymin, xmin, ymax, xmax] = region.box_2d.map((v) => v / 1000);
      return {
        box: { x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin },
        observations: Object.fromEntries(
          regionFeatures.map((name) => [name, String(region[name])]),
        ),
        descriptionEn: region.descriptionEn,
        descriptionVi: region.descriptionVi,
      };
    }),
  };
}
