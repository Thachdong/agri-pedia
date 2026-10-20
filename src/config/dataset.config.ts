import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const datasetConfigSchema = z.object({
  /** Images with a shorter side (px) are not kept for training. */
  minShortSidePx: z.coerce.number().int().positive().default(512),
  /** Minimum sharpness (Laplacian std dev of the greyscale image, long side <= 1024px); lower = blurry. */
  minSharpness: z.coerce.number().nonnegative().default(0.8),
  /** Accepted mean greyscale brightness (0..255): darker / brighter = badly exposed. */
  minBrightness: z.coerce.number().min(0).max(255).default(40),
  maxBrightness: z.coerce.number().min(0).max(255).default(220),
});

export type TDatasetConfig = z.infer<typeof datasetConfigSchema>;

export const datasetConfig = registerAs('dataset', (): TDatasetConfig =>
  datasetConfigSchema.parse({
    minShortSidePx: process.env.DATASET_MIN_SHORT_SIDE_PX,
    minSharpness: process.env.DATASET_MIN_SHARPNESS,
    minBrightness: process.env.DATASET_MIN_BRIGHTNESS,
    maxBrightness: process.env.DATASET_MAX_BRIGHTNESS,
  }),
);
