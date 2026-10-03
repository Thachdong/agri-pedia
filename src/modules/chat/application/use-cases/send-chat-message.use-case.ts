import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  IRealtimeChannels,
  IRealtimePublisher,
  REALTIME_CHANNELS,
  REALTIME_PUBLISHER,
} from '@shared/realtime';
import {
  ChatMessage,
  ChatReceiverNotFoundException,
  ChatRoom,
  ChatRoomNotFoundException,
  ChatRoomOrReceiverRequiredException,
  ChatSenderNotAllowedException,
  InvalidChatReceiverException,
} from '../../domain';
import { chatRoomChannel } from '../chat-room-channel';
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
  /** Null when the sender no longer exists. */
  senderUsername: string | null;
  /** Signed read URL of the sender's avatar; null when none. */
  senderAvatar: string | null;
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

/**
 * An ACTIVE user messages the other member of a FARMER <-> DISTRIBUTOR room, then pushes it to them in realtime
 * together with the sender's username and avatar.
 * The message is read by the receiver right away if they have the room open (entered), unread otherwise.
 */
@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messages: IChatMessageRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(REALTIME_PUBLISHER) private readonly realtime: IRealtimePublisher,
    @Inject(REALTIME_CHANNELS) private readonly channels: IRealtimeChannels,
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
        room.recordMessage(message);
        if (
          await this.channels.hasUser(chatRoomChannel(room.id), otherMemberId)
        ) {
          room.markReadBy(otherMemberId, message.createdAt);
        }
        await this.rooms.save(room);
        return { room, message, otherMemberId };
      });

    const [senderProfile, [senderAvatar]] = await Promise.all([
      this.userQuery.findProfileById(senderId),
      this.mediaQuery.findThumbnails('USER_AVATAR', [senderId]),
    ]);
    this.realtime.emitToUser(
      otherMemberId,
      CHAT_MESSAGE_RECEIVED_REALTIME_EVENT,
      {
        messageId: message.id,
        roomId: room.id,
        senderId,
        senderUsername: senderProfile?.username ?? null,
        senderAvatar: senderAvatar?.url ?? null,
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
