import type { Transporter } from 'nodemailer';
import { ILogger } from '@shared/logger';
import { IMessageSender, TOutboundMessage } from './messaging.interface';

/** Sends EMAIL messages as plain-text mail through an SMTP transporter (nodemailer). */
export class SmtpEmailSender implements IMessageSender {
  private readonly logger: ILogger;

  constructor(
    private readonly transporter: Pick<Transporter, 'sendMail'>,
    private readonly from: string,
    logger: ILogger,
  ) {
    this.logger = logger.withContext(SmtpEmailSender.name);
  }

  async send(message: TOutboundMessage): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
    // Body omitted: it may hold OTP codes.
    this.logger.info('Email sent', {
      to: message.to,
      subject: message.subject,
      messageId: info.messageId,
    });
  }
}
