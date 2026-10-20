import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EChatMessageType } from '../enums/chat-message-type.enum';
import { ChatInvalidDiagnosisReferenceException } from '../exceptions/chat-invalid-diagnosis-reference.exception';
import { InvalidChatMessageException } from '../exceptions/invalid-chat-message.exception';

export const CHAT_MESSAGE_MAX_LENGTH = 2000;

export type TChatMessageProps = {
  roomId: string;
  senderId: string;
  message: string;
  type: EChatMessageType;
  /** Shared diagnosis; set only for DIAGNOSIS_REPORT. */
  diagnosisId: string | null;
  createdAt: Date;
};

export type TCreateChatMessageProps = {
  roomId: string;
  senderId: string;
  message: string;
  /** Default TEXT. */
  type?: EChatMessageType;
  diagnosisId?: string | null;
};

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
    const type = input.type ?? EChatMessageType.TEXT;
    const diagnosisId = input.diagnosisId ?? null;
    if (
      (type === EChatMessageType.DIAGNOSIS_REPORT) !==
      (diagnosisId !== null)
    ) {
      throw new ChatInvalidDiagnosisReferenceException(type);
    }
    return new ChatMessage(randomUUID(), {
      roomId: input.roomId,
      senderId: input.senderId,
      message,
      type,
      diagnosisId,
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

  get type(): EChatMessageType {
    return this.props.type;
  }

  get diagnosisId(): string | null {
    return this.props.diagnosisId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
