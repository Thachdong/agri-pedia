import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const smsConfigSchema = z.preprocess(
  // unset / empty transport = log-only (local / test)
  (v) => {
    const raw = v as Record<string, unknown>;
    return { ...raw, transport: raw.transport || 'LOG' };
  },
  z.discriminatedUnion('transport', [
    /** SMS are written to the log, not sent. */
    z.object({ transport: z.literal('LOG') }),
    /** SMS are sent through SpeedSMS (customer-care type, random sender number, no brandname). */
    z.object({
      transport: z.literal('SPEEDSMS'),
      speedSmsAccessToken: z.string().min(1),
    }),
  ]),
);

export type TSmsConfig = z.infer<typeof smsConfigSchema>;

export const smsConfig = registerAs('sms', (): TSmsConfig =>
  smsConfigSchema.parse({
    transport: process.env.SMS_TRANSPORT,
    speedSmsAccessToken: process.env.SMS_SPEEDSMS_ACCESS_TOKEN,
  }),
);
