import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const knowledgeConfigSchema = z.object({
  // crop codes enabled for diagnosis on top of crop.json `enabled` (e.g. to try a crop on staging)
  enabledCrops: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((code) => code.trim())
        .filter(Boolean),
    ),
});

export type TKnowledgeConfig = z.infer<typeof knowledgeConfigSchema>;

export const knowledgeConfig = registerAs('knowledge', (): TKnowledgeConfig =>
  knowledgeConfigSchema.parse({
    enabledCrops: process.env.KNOWLEDGE_ENABLED_CROPS,
  }),
);
