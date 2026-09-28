import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { ChatNotRoomMemberException } from '../exceptions/chat-not-room-member.exception';
import { InvalidChatReceiverException } from '../exceptions/invalid-chat-receiver.exception';
import { ChatMessage } from './chat-message.entity';

export type TChatRoomProps = {
  /** User who opened the room. */
  firstUserId: string;
  secondUserId: string;
  createdAt: Date;
  /** createdAt of the newest message; createdAt of the room until the first one. */
  lastMessageAt: Date;
  /** Messages up to this instant count as read by that member; null = never read. */
  firstUserLastReadAt: Date | null;
  secondUserLastReadAt: Date | null;
};

export type TCreateChatRoomProps = Pick<
  TChatRoomProps,
  'firstUserId' | 'secondUserId'
>;

const later = (current: Date | null, next: Date): Date =>
  current && current > next ? current : next;

/** One-to-one conversation between two distinct users. */
export class ChatRoom extends AggregateRoot {
  private constructor(
    id: string,
    private props: TChatRoomProps,
  ) {
    super(id);
  }

  static create(input: TCreateChatRoomProps): ChatRoom {
    if (input.firstUserId === input.secondUserId) {
      throw new InvalidChatReceiverException(input.secondUserId);
    }
    const createdAt = new Date();
    return new ChatRoom(randomUUID(), {
      firstUserId: input.firstUserId,
      secondUserId: input.secondUserId,
      createdAt,
      lastMessageAt: createdAt,
      firstUserLastReadAt: null,
      secondUserLastReadAt: null,
    });
  }

  static restore(id: string, props: TChatRoomProps): ChatRoom {
    return new ChatRoom(id, { ...props });
  }

  /** The member who is not `userId`; throws if `userId` is not a member. */
  otherMember(userId: string): string {
    if (userId === this.props.firstUserId) {
      return this.props.secondUserId;
    }
    if (userId === this.props.secondUserId) {
      return this.props.firstUserId;
    }
    throw new ChatNotRoomMemberException(this.id, userId);
  }

  /** A message was posted here: it becomes the last one and is read by its sender. */
  recordMessage(message: ChatMessage): void {
    if (message.roomId !== this.id) {
      throw new Error(
        `Message ${message.id} belongs to room ${message.roomId}, not ${this.id}`,
      );
    }
    this.markReadBy(message.senderId, message.createdAt);
    this.props.lastMessageAt = later(
      this.props.lastMessageAt,
      message.createdAt,
    );
  }

  /** Messages up to `at` count as read by `userId`; the marker never moves back. */
  markReadBy(userId: string, at: Date): void {
    if (this.isFirstUser(userId)) {
      this.props.firstUserLastReadAt = later(
        this.props.firstUserLastReadAt,
        at,
      );
    } else {
      this.props.secondUserLastReadAt = later(
        this.props.secondUserLastReadAt,
        at,
      );
    }
  }

  lastReadAtOf(userId: string): Date | null {
    return this.isFirstUser(userId)
      ? this.props.firstUserLastReadAt
      : this.props.secondUserLastReadAt;
  }

  /** Throws if `userId` is not a member. */
  private isFirstUser(userId: string): boolean {
    this.otherMember(userId);
    return userId === this.props.firstUserId;
  }

  get firstUserId(): string {
    return this.props.firstUserId;
  }

  get secondUserId(): string {
    return this.props.secondUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastMessageAt(): Date {
    return this.props.lastMessageAt;
  }

  get firstUserLastReadAt(): Date | null {
    return this.props.firstUserLastReadAt;
  }

  get secondUserLastReadAt(): Date | null {
    return this.props.secondUserLastReadAt;
  }
}
