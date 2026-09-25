import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const databaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(5432),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  logging: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type TDatabaseConfig = z.infer<typeof databaseConfigSchema>;

export const databaseConfig = registerAs('database', (): TDatabaseConfig =>
  databaseConfigSchema.parse({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: process.env.DB_LOGGING,
  }),
);
