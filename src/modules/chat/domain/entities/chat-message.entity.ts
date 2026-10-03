import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { InvalidChatMessageException } from '../exceptions/invalid-chat-message.exception';

export const CHAT_MESSAGE_MAX_LENGTH = 2000;

export type TChatMessageProps = {
  roomId: string;
  senderId: string;
  message: string;
  createdAt: Date;
};

export type TCreateChatMessageProps = Omit<TChatMessageProps, 'createdAt'>;

export class ChatMessage extends AggregateRoot {
  private constructor(
    id: string,
    private props: TChatMessageProps,
  ) {
    super(id);
  }

  static create(input: TCreateChatMessageProps): ChatMessage {
    const message = input.message.trim();
    if (message.length === 0 || message.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new InvalidChatMessageException(CHAT_MESSAGE_MAX_LENGTH);
    }
    return new ChatMessage(randomUUID(), {
      roomId: input.roomId,
      senderId: input.senderId,
      message,
      createdAt: new Date(),
    });
  }

  static restore(id: string, props: TChatMessageProps): ChatMessage {
    return new ChatMessage(id, { ...props });
  }

  get roomId(): string {
    return this.props.roomId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get message(): string {
    return this.props.message;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
