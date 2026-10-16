import { TKnowledgeDiagnosisCrop } from '@modules/knowledge/contracts';
import { TDescribeInput } from '../../../application/ports';

export const DESCRIBE_PROMPT_VERSION = 'd2';

/** One line per feature with a description or hints: `- name (description): VALUE = hint; ...`. */
function featureHints(crop: TKnowledgeDiagnosisCrop): string[] {
  return Object.entries(crop.features).flatMap(([name, feature]) => {
    const hints = Object.entries(feature.hintsEn ?? {}).map(
      ([value, hint]) => `${value} = ${hint}`,
    );
    if (!feature.descriptionEn && hints.length === 0) return [];
    const label = feature.descriptionEn
      ? `${name} (${feature.descriptionEn})`
      : name;
    return [
      hints.length > 0 ? `- ${label}: ${hints.join('; ')}.` : `- ${label}.`,
    ];
  });
}

/**
 * System prompt for photos of `crop`: fixed per crop and KB version (cacheable); everything that
 * varies per image is in the user message.
 */
export function buildDescribeSystemPrompt(
  crop: TKnowledgeDiagnosisCrop,
): string {
  const imageFeatures = Object.values(crop.features)
    .filter((feature) => feature.level === 'image')
    .map((feature) => feature.descriptionEn)
    .filter(Boolean);
  const parts = crop.plantParts
    .map((part) => `${part.code} = ${part.promptEn}`)
    .join('; ');
  return `You are a careful field observer of ${crop.prompt.subjectEn}. You describe what is visible in one photo.
You never diagnose: do not name diseases, pests or deficiencies, and do not guess causes.

Answer in the given JSON schema:
- isTargetCrop: YES if the main subject is a ${crop.nameEn} plant or part of one, NO if it is clearly something else, UNSURE otherwise.
- quality: GOOD if symptoms can be judged; BLURRY (out of focus / motion), TOO_FAR (plant parts too small to see symptoms), TOO_DARK.
- detectedPart: the plant part that fills most of the photo (${parts}). The user's hint may be wrong; trust the image.
- wholeImage: features of the whole photo (${imageFeatures.join(', ')}).
- regions: up to the requested number of the clearest, most typical abnormal regions (lesions, spots, streaks, damage, insects, eggs). Prefer distinct regions over many similar ones.
  - box_2d: [ymin, xmin, ymax, xmax] tightly around the region, integers 0..1000 relative to the image as received.
  - Fill every feature with exactly one allowed value. Use UNSURE whenever a feature is not clearly visible; NONE only when you can see it is absent.
  - descriptionEn: one short factual sentence of what is seen (shape, colours, size, position). No disease names.
  - descriptionVi: the same content in simple Vietnamese for farmers. No disease names.
- If the whole plant or organ looks abnormal (${crop.prompt.wholeImageCuesEn}) without a distinct lesion, return one region covering the whole image with lesionShape NO_DISTINCT_LESION and distribution WHOLE_ORGAN.
- If nothing looks abnormal, return an empty regions list.

Feature value hints:
${featureHints(crop).join('\n')}`;
}

export function buildDescribeUserMessage(input: TDescribeInput): string {
  const part = input.crop.plantParts.find(
    (candidate) => candidate.code === input.plantPart,
  );
  const hint = part
    ? `The user says the photo shows: ${part.promptEn} (a hint; it may be wrong).`
    : 'The user did not say which plant part the photo shows.';
  return [
    `Crop: ${input.crop.nameEn} (${input.crop.code}).`,
    hint,
    `Return at most ${input.maxRegions} regions.`,
    'The photo follows.',
  ].join('\n');
}
