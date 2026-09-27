import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const storageConfigSchema = z.object({
  /** Firebase service account (firebase-admin credentials). */
  firebaseProjectId: z.string().min(1),
  firebaseClientEmail: z.string().email(),
  /** PEM key; literal `\n` sequences (single-line env values) become newlines. */
  firebasePrivateKey: z
    .string()
    .min(1)
    .transform((v) => v.replace(/\\n/g, '\n')),
  firebaseStorageBucket: z.string().min(1),
  presignUrlTtlSeconds: z.coerce.number().int().positive().default(900),
});

export type TStorageConfig = z.infer<typeof storageConfigSchema>;

export const storageConfig = registerAs('storage', (): TStorageConfig =>
  storageConfigSchema.parse({
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    presignUrlTtlSeconds: process.env.STORAGE_PRESIGN_URL_TTL_SECONDS,
  }),
);
