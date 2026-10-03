import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const hexKey32Bytes = /^[0-9a-fA-F]{64}$/;

const securityConfigSchema = z.object({
  /** HMAC-SHA256 secret used to hash identifiers (email/phone) for lookup. */
  identifierHashSecret: z.string().min(32),
  /** AES-256-GCM key (32 bytes, hex encoded) used to encrypt identifiers and OTP codes. */
  identifierEncryptionKey: z
    .string()
    .regex(hexKey32Bytes, 'must be 64 hex characters (32 bytes)'),
});

export type TSecurityConfig = z.infer<typeof securityConfigSchema>;

export const securityConfig = registerAs('security', (): TSecurityConfig =>
  securityConfigSchema.parse({
    identifierHashSecret: process.env.SECURITY_IDENTIFIER_HASH_SECRET,
    identifierEncryptionKey: process.env.SECURITY_IDENTIFIER_ENCRYPTION_KEY,
  }),
);
