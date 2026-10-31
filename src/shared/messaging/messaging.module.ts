import { Global, Module } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ILogger, LOGGER } from '@shared/logger';
import { ChannelMessageSender } from './channel.messaging';
import { LogMessageSender } from './log.messaging';
import { EMessageChannel, MESSAGE_SENDER } from './messaging.interface';
import { SmtpEmailSender } from './smtp.messaging';

/** EMAIL goes through SMTP when `mail.transport` is SMTP, else to the log; PHONE always goes to the log (no SMS provider yet). */
const messageSenderFactory = (
  config: IConfigService,
  logger: ILogger,
): ChannelMessageSender => {
  const logSender = new LogMessageSender(logger, config);
  const mail = config.get('mail');
  const emailSender =
    mail.transport === 'SMTP'
      ? new SmtpEmailSender(
          createTransport({
            host: mail.smtpHost,
            port: mail.smtpPort,
            secure: mail.smtpSecure,
            auth: { user: mail.smtpUser, pass: mail.smtpPassword },
          }),
          mail.from,
          logger,
        )
      : logSender;
  return new ChannelMessageSender({
    [EMessageChannel.EMAIL]: emailSender,
    [EMessageChannel.PHONE]: logSender,
  });
};

@Global()
@Module({
  providers: [
    {
      provide: MESSAGE_SENDER,
      inject: [CONFIG_SERVICE, LOGGER],
      useFactory: messageSenderFactory,
    },
  ],
  exports: [MESSAGE_SENDER],
})
export class MessagingModule {}
