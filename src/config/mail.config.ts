import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const mailConfigSchema = z.preprocess(
  // unset / empty transport = log-only (local / test)
  (v) => {
    const raw = v as Record<string, unknown>;
    return { ...raw, transport: raw.transport || 'LOG' };
  },
  z.discriminatedUnion('transport', [
    /** Emails are written to the log, not sent. */
    z.object({ transport: z.literal('LOG') }),
    /** Emails are sent through an SMTP server. */
    z.object({
      transport: z.literal('SMTP'),
      smtpHost: z.string().min(1),
      smtpPort: z.coerce.number().int().positive().default(587),
      /** true = TLS from the start (port 465); false = STARTTLS upgrade (port 587). */
      smtpSecure: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
      smtpUser: z.string().min(1),
      smtpPassword: z.string().min(1),
      /** Sender, e.g. `AgriPedia <no-reply@agripedia.vn>`. */
      from: z.string().min(1),
    }),
  ]),
);

export type TMailConfig = z.infer<typeof mailConfigSchema>;

export const mailConfig = registerAs('mail', (): TMailConfig =>
  mailConfigSchema.parse({
    transport: process.env.MAIL_TRANSPORT,
    smtpHost: process.env.MAIL_SMTP_HOST,
    smtpPort: process.env.MAIL_SMTP_PORT,
    smtpSecure: process.env.MAIL_SMTP_SECURE,
    smtpUser: process.env.MAIL_SMTP_USER,
    smtpPassword: process.env.MAIL_SMTP_PASSWORD,
    from: process.env.MAIL_FROM,
  }),
);
