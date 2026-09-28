import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IRealtimePublisher, REALTIME_PUBLISHER } from '@shared/realtime';
import {
  ChatMessage,
  ChatReceiverNotFoundException,
  ChatRoom,
  ChatRoomNotFoundException,
  ChatRoomOrReceiverRequiredException,
  ChatSenderNotAllowedException,
  InvalidChatReceiverException,
} from '../../domain';
import {
  CHAT_MESSAGE_REPOSITORY,
  IChatMessageRepository,
} from '../ports/chat-message.repository';
import {
  CHAT_ROOM_REPOSITORY,
  IChatRoomRepository,
} from '../ports/chat-room.repository';

/** Realtime event pushed to the other room member. */
export const CHAT_MESSAGE_RECEIVED_REALTIME_EVENT = 'chat.message.received';

export type TChatMessageReceivedRealtimePayload = {
  messageId: string;
  roomId: string;
  senderId: string;
  message: string;
  /** ISO 8601. */
  createdAt: string;
};

export type TSendChatMessageInput = {
  senderId: string;
  /** Existing room; wins over receiverId when both are given. */
  roomId?: string;
  /** Opens (or reuses) the room with this user when roomId is absent. */
  receiverId?: string;
  message: string;
};
export type TSendChatMessageOutput = {
  messageId: string;
  roomId: string;
  createdAt: Date;
};

/** An ACTIVE user messages the other member of a FARMER <-> DISTRIBUTOR room, then pushes it to them in realtime. */
@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messages: IChatMessageRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: IRealtimePublisher,
  ) {}

  async execute(input: TSendChatMessageInput): Promise<TSendChatMessageOutput> {
    const { senderId, roomId, receiverId } = input;
    const sender = await this.userQuery.findRoleById(senderId);
    if (!sender || !sender.isActive) {
      throw new ChatSenderNotAllowedException(senderId);
    }
    if (!roomId && receiverId) {
      await this.assertValidReceiver(sender.role, senderId, receiverId);
    }

    const { room, message, otherMemberId } =
      await this.unitOfWork.runInTransaction(async () => {
        const room = await this.resolveRoom(senderId, roomId, receiverId);
        const otherMemberId = room.otherMember(senderId);
        const message = ChatMessage.create({
          roomId: room.id,
          senderId,
          message: input.message,
        });
        await this.messages.save(message);
        return { room, message, otherMemberId };
      });

    this.realtime.emitToUser(
      otherMemberId,
      CHAT_MESSAGE_RECEIVED_REALTIME_EVENT,
      {
        messageId: message.id,
        roomId: room.id,
        senderId,
        message: message.message,
        createdAt: message.createdAt.toISOString(),
      } satisfies TChatMessageReceivedRealtimePayload,
    );
    return {
      messageId: message.id,
      roomId: room.id,
      createdAt: message.createdAt,
    };
  }

  private async resolveRoom(
    senderId: string,
    roomId: string | undefined,
    receiverId: string | undefined,
  ): Promise<ChatRoom> {
    if (roomId) {
      const room = await this.rooms.findById(roomId);
      if (!room) {
        throw new ChatRoomNotFoundException(roomId);
      }
      return room;
    }
    if (receiverId) {
      const existing = await this.rooms.findByMembers(senderId, receiverId);
      return (
        existing ??
        this.rooms.saveIfAbsent(
          ChatRoom.create({ firstUserId: senderId, secondUserId: receiverId }),
        )
      );
    }
    throw new ChatRoomOrReceiverRequiredException();
  }

  /** Receiver must be another ACTIVE user with the opposite role. */
  private async assertValidReceiver(
    senderRole: string,
    senderId: string,
    receiverId: string,
  ): Promise<void> {
    if (receiverId === senderId) {
      throw new InvalidChatReceiverException(receiverId);
    }
    const receiver = await this.userQuery.findRoleById(receiverId);
    if (!receiver) {
      throw new ChatReceiverNotFoundException(receiverId);
    }
    if (!receiver.isActive || receiver.role === senderRole) {
      throw new InvalidChatReceiverException(receiverId);
    }
  }
}
