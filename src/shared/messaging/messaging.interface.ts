export enum EMessageChannel {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export type TOutboundMessage = {
  channel: EMessageChannel;
  /** Email address or phone number, depending on `channel`. */
  to: string;
  /** Used by EMAIL; ignored by PHONE. */
  subject?: string;
  body: string;
};

export interface IMessageSender {
  /** Rejects if the message could not be handed to the provider. */
  send(message: TOutboundMessage): Promise<void>;
}

export const MESSAGE_SENDER = Symbol('MESSAGE_SENDER');
