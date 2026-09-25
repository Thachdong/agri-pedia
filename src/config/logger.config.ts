import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const loggerConfigSchema = z.object({
  level: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  filePath: z.string().min(1).default('logs/app.log'),
});

export type TLoggerConfig = z.infer<typeof loggerConfigSchema>;

export const loggerConfig = registerAs('logger', (): TLoggerConfig =>
  loggerConfigSchema.parse({
    level: process.env.LOG_LEVEL,
    filePath: process.env.LOG_FILE_PATH,
  }),
);
