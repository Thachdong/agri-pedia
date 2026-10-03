import { IMessageSender, TOutboundMessage } from './messaging.interface';

/** Test fake: records sent messages. Set `failWith` to make `send` reject. */
export class InMemoryMessageSender implements IMessageSender {
  readonly sent: TOutboundMessage[] = [];
  failWith?: Error;

  async send(message: TOutboundMessage): Promise<void> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.sent.push(message);
  }
}
