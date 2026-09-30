import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const authConfigSchema = z.object({
  /** HMAC secret used to sign access tokens (JWT). */
  accessTokenSecret: z.string().min(32),
  accessTokenTtlSeconds: z.coerce.number().int().positive().default(900),
  refreshTokenTtlSeconds: z.coerce.number().int().positive().default(2592000),
  /** A ROTATED token reused within this window counts as a retry, not as theft. */
  refreshTokenGraceSeconds: z.coerce.number().int().nonnegative().default(30),
  /** Lifetime of a realtime ticket: only long enough to open one socket connection. */
  realtimeTicketTtlSeconds: z.coerce.number().int().positive().default(30),
});

export type TAuthConfig = z.infer<typeof authConfigSchema>;

export const authConfig = registerAs('auth', (): TAuthConfig =>
  authConfigSchema.parse({
    accessTokenSecret: process.env.AUTH_ACCESS_TOKEN_SECRET,
    accessTokenTtlSeconds: process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    refreshTokenGraceSeconds: process.env.AUTH_REFRESH_TOKEN_GRACE_SECONDS,
    realtimeTicketTtlSeconds: process.env.AUTH_REALTIME_TICKET_TTL_SECONDS,
  }),
);
