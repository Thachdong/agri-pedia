import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ILogger, LOGGER } from '@shared/logger';
import { IMessageSender, TOutboundMessage } from './messaging.interface';

/**
 * Placeholder sender until a real email/SMS provider is wired: writes the message to the log.
 * Outside production the body (may hold OTP codes) is part of the log message; in production it is omitted.
 */
@Injectable()
export class LogMessageSender implements IMessageSender {
  private readonly logger: ILogger;
  private readonly includeBody: boolean;

  constructor(
    @Inject(LOGGER) logger: ILogger,
    @Inject(CONFIG_SERVICE) config: IConfigService,
  ) {
    this.logger = logger.withContext(LogMessageSender.name);
    this.includeBody = config.get('app').nodeEnv !== 'production';
  }

  async send(message: TOutboundMessage): Promise<void> {
    const meta = {
      channel: message.channel,
      to: message.to,
      subject: message.subject,
    };
    if (!this.includeBody) {
      this.logger.info('Message sent (log only)', meta);
      return;
    }
    // Body in the message text (not meta) so pretty logs show it up front, e.g. the OTP code.
    this.logger.info(
      `Message sent (log only) ${message.channel} -> ${message.to}: ${message.body}`,
      meta,
    );
  }
}
