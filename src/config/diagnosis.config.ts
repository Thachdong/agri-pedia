import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const diagnosisConfigSchema = z.object({
  /** AI provider used for both vision steps (B1 describe, B3 verify). */
  provider: z.enum(['GEMINI']).default('GEMINI'),
  apiKey: z.string().min(1),
  /** Model for B1 (describe: regions + observations). */
  describeModel: z.string().min(1).default('gemini-3-flash-preview'),
  /** Model for B3 (verify: pick one candidate per region). */
  verifyModel: z.string().min(1).default('gemini-3-flash-preview'),
  /** Timeout of each AI request. */
  timeoutMs: z.coerce.number().int().positive().default(60000),
  /** Concurrent AI requests per process. */
  concurrency: z.coerce.number().int().positive().default(5),
  maxRegionsPerImage: z.coerce.number().int().positive().default(5),
  candidatesPerRegion: z.coerce.number().int().positive().default(3),
});

export type TDiagnosisConfig = z.infer<typeof diagnosisConfigSchema>;

export const diagnosisConfig = registerAs('diagnosis', (): TDiagnosisConfig =>
  diagnosisConfigSchema.parse({
    provider: process.env.DIAGNOSIS_PROVIDER,
    apiKey: process.env.DIAGNOSIS_API_KEY,
    describeModel: process.env.DIAGNOSIS_DESCRIBE_MODEL,
    verifyModel: process.env.DIAGNOSIS_VERIFY_MODEL,
    timeoutMs: process.env.DIAGNOSIS_TIMEOUT_MS,
    concurrency: process.env.DIAGNOSIS_CONCURRENCY,
    maxRegionsPerImage: process.env.DIAGNOSIS_MAX_REGIONS_PER_IMAGE,
    candidatesPerRegion: process.env.DIAGNOSIS_CANDIDATES_PER_REGION,
  }),
);
