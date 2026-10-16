import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  port: z.coerce.number().int().positive().default(3000),
  // allowed browser origins in production; other envs allow any origin
  corsOrigins: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

export type TAppConfig = z.infer<typeof appConfigSchema>;

export const appConfig = registerAs('app', (): TAppConfig =>
  appConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    corsOrigins: process.env.CORS_ORIGINS,
  }),
);
