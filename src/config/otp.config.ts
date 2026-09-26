import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const otpConfigSchema = z.object({
  length: z.coerce.number().int().min(4).max(10).default(6),
  ttlSeconds: z.coerce.number().int().positive().default(300),
  maxWrongCount: z.coerce.number().int().positive().default(5),
  maxRetryCount: z.coerce.number().int().positive().default(5),
  /** Block duration when wrongCount exceeds maxWrongCount. */
  wrongBlockSeconds: z.coerce.number().int().positive().default(900),
  /** Block duration when retryCount exceeds maxRetryCount. */
  retryBlockSeconds: z.coerce.number().int().positive().default(3600),
});

export type TOtpConfig = z.infer<typeof otpConfigSchema>;

export const otpConfig = registerAs('otp', (): TOtpConfig =>
  otpConfigSchema.parse({
    length: process.env.OTP_LENGTH,
    ttlSeconds: process.env.OTP_TTL_SECONDS,
    maxWrongCount: process.env.OTP_MAX_WRONG_COUNT,
    maxRetryCount: process.env.OTP_MAX_RETRY_COUNT,
    wrongBlockSeconds: process.env.OTP_WRONG_BLOCK_SECONDS,
    retryBlockSeconds: process.env.OTP_RETRY_BLOCK_SECONDS,
  }),
);
