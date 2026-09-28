import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { ChatNotRoomMemberException } from '../exceptions/chat-not-room-member.exception';
import { InvalidChatReceiverException } from '../exceptions/invalid-chat-receiver.exception';

export type TChatRoomProps = {
  /** User who opened the room. */
  firstUserId: string;
  secondUserId: string;
  createdAt: Date;
};

export type TCreateChatRoomProps = Omit<TChatRoomProps, 'createdAt'>;

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
    return new ChatRoom(randomUUID(), {
      firstUserId: input.firstUserId,
      secondUserId: input.secondUserId,
      createdAt: new Date(),
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

  get firstUserId(): string {
    return this.props.firstUserId;
  }

  get secondUserId(): string {
    return this.props.secondUserId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
