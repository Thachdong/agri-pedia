import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ILogger, LOGGER } from '@shared/logger';
import { IMessageSender, TOutboundMessage } from './messaging.interface';

/**
 * Placeholder sender until a real email/SMS provider is wired: writes the message to the log.
 * The body (may hold OTP codes) is logged only outside production.
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
    this.logger.info('Message sent (log only)', {
      channel: message.channel,
      to: message.to,
      subject: message.subject,
      ...(this.includeBody ? { body: message.body } : {}),
    });
  }
}
