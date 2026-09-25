import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
});

export type TAppConfig = z.infer<typeof appConfigSchema>;

export const appConfig = registerAs('app', (): TAppConfig =>
  appConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
  }),
);
