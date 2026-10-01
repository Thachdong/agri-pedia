import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const distributorSearchConfigSchema = z.object({
  /** First stage of a point search: distributors within this distance. */
  radiusKm: z.coerce.number().positive().default(30),
});

export type TDistributorSearchConfig = z.infer<
  typeof distributorSearchConfigSchema
>;

export const distributorSearchConfig = registerAs(
  'distributorSearch',
  (): TDistributorSearchConfig =>
    distributorSearchConfigSchema.parse({
      radiusKm: process.env.DISTRIBUTOR_SEARCH_RADIUS_KM,
    }),
);
