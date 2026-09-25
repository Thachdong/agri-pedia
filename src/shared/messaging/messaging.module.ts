import { Global, Module } from '@nestjs/common';
import { LogMessageSender } from './log.messaging';
import { MESSAGE_SENDER } from './messaging.interface';

@Global()
@Module({
  providers: [{ provide: MESSAGE_SENDER, useClass: LogMessageSender }],
  exports: [MESSAGE_SENDER],
})
export class MessagingModule {}
