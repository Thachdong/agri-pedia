import {
  EMessageChannel,
  IMessageSender,
  TOutboundMessage,
} from './messaging.interface';

/** Hands each message to the sender of its channel. */
export class ChannelMessageSender implements IMessageSender {
  constructor(
    private readonly senders: Record<EMessageChannel, IMessageSender>,
  ) {}

  send(message: TOutboundMessage): Promise<void> {
    return this.senders[message.channel].send(message);
  }
}
