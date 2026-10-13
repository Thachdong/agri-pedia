import { z } from 'zod';
import { EConfidenceLevel } from '../../../domain';

/** B3 structured output; `verdict` is limited to the codes sent in this request (or NONE). */
export function verifyOutputSchema(candidateCodes: string[]) {
  return z.object({
    regions: z.array(
      z.object({
        regionIndex: z.number().int(),
        isLesion: z.boolean(),
        verdict: z.enum(['NONE', ...candidateCodes]),
        supportingFeatures: z.array(z.string()),
        selfConfidence: z.nativeEnum(EConfidenceLevel),
      }),
    ),
    imageNotes: z.string().optional(),
  });
}

export type TVerifyOutputSchema = z.infer<
  ReturnType<typeof verifyOutputSchema>
>;
