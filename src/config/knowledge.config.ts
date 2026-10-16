import { registerAs } from '@nestjs/config';
import { z } from 'zod';

/** Empty env value (`KEY=`) counts as unset. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const knowledgeConfigSchema = z
  .object({
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
    /** Client webhook that drops cached article pages; unset = no revalidation (local / test). */
    articleRevalidateUrl: optional(z.string().url()),
    /** Sent as `x-revalidate-secret`; required when the URL is set. */
    articleRevalidateSecret: optional(z.string().min(32)),
  })
  .refine((c) => !c.articleRevalidateUrl || c.articleRevalidateSecret, {
    message:
      'ARTICLE_REVALIDATE_SECRET is required when ARTICLE_REVALIDATE_URL is set',
    path: ['articleRevalidateSecret'],
  });

export type TKnowledgeConfig = z.infer<typeof knowledgeConfigSchema>;

export const knowledgeConfig = registerAs('knowledge', (): TKnowledgeConfig =>
  knowledgeConfigSchema.parse({
    enabledCrops: process.env.KNOWLEDGE_ENABLED_CROPS,
    articleRevalidateUrl: process.env.ARTICLE_REVALIDATE_URL,
    articleRevalidateSecret: process.env.ARTICLE_REVALIDATE_SECRET,
  }),
);
