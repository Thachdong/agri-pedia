import { TVerifyInput } from '../../../application/ports';

export const VERIFY_PROMPT_VERSION = 'v1';

/** Fixed (cacheable); everything that varies per image is in the user message. */
export const VERIFY_SYSTEM_PROMPT = `You are a rice plant health specialist checking candidate diagnoses for regions of one photo.

You receive:
- a downscaled photo of the whole plant, for context;
- numbered crops, one per region (regionIndex), with what an observer noted and the candidate codes for that region;
- a card per candidate: name, typical symptoms, visual keywords, and how to tell it apart from the other candidates.

For each region given, answer one entry with the same regionIndex:
- isLesion: false when the region is not a plant problem (soil, water drops, shadow, light reflection, insect-free mechanical damage, normal plant structure).
- verdict: exactly one code from that region's candidate codes, or NONE when no candidate matches what is visible or isLesion is false. Never use a code from another region's list.
- supportingFeatures: 1 to 4 short Vietnamese phrases naming visible features that support the verdict (e.g. "vết hình thoi", "tâm xám trắng"). Empty when verdict is NONE.
- selfConfidence: HIGH when typical features are clearly visible and the other candidates are ruled out; MEDIUM when it fits but some features are unclear; LOW when it is a weak guess.

Judge only from what is visible in the crops and the photo. Use the "distinguish from" notes to separate similar candidates.`;

/** Text part of the user message; the images follow as labelled parts. */
export function buildVerifyUserMessage(input: TVerifyInput): string {
  const regions = input.regions.map((region) => ({
    regionIndex: region.regionIndex,
    observed: region.descriptionEn,
    observations: region.observations,
    candidateCodes: region.candidateCodes,
  }));
  const cards = input.cards.map((card) => ({
    code: card.code,
    name: card.name,
    symptoms: card.symptoms,
    visualKeywords: card.visualKeywords,
    distinguishFrom: card.distinguishFrom,
  }));
  return [
    'Regions:',
    JSON.stringify(regions, null, 1),
    'Candidate cards:',
    JSON.stringify(cards, null, 1),
    'Images follow: first the whole photo, then each region crop labelled with its regionIndex.',
  ].join('\n');
}
