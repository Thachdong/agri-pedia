import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const productSuggestionConfigSchema = z.object({
  /** AI provider that reads the product name from the photo. */
  provider: z.enum(['GEMINI']).default('GEMINI'),
  apiKey: z.string().min(1),
  model: z.string().min(1).default('gemini-3-flash-lite'),
  /** Timeout of the AI request. */
  timeoutMs: z.coerce.number().int().positive().default(30000),
  /** Minimum pg_trgm similarity (0..1) for a catalog item to count as a match. */
  matchThreshold: z.coerce.number().min(0).max(1).default(0.4),
});

export type TProductSuggestionConfig = z.infer<
  typeof productSuggestionConfigSchema
>;

export const productSuggestionConfig = registerAs(
  'productSuggestion',
  (): TProductSuggestionConfig =>
    productSuggestionConfigSchema.parse({
      provider: process.env.PRODUCT_SUGGESTION_PROVIDER,
      apiKey: process.env.PRODUCT_SUGGESTION_API_KEY,
      model: process.env.PRODUCT_SUGGESTION_MODEL,
      timeoutMs: process.env.PRODUCT_SUGGESTION_TIMEOUT_MS,
      matchThreshold: process.env.PRODUCT_SUGGESTION_MATCH_THRESHOLD,
    }),
);
