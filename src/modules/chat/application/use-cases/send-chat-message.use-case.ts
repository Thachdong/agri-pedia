import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_QUERY_PORT,
  IDiagnosisQueryPort,
} from '@modules/diagnosis/contracts';
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
  ChatDiagnosisNotCompletedException,
  ChatDiagnosisNotFoundException,
  ChatDiagnosisReportNotAllowedException,
  ChatMessage,
  ChatReceiverNotFoundException,
  ChatRoom,
  ChatRoomNotFoundException,
  ChatRoomOpenNotAllowedException,
  ChatRoomOrReceiverRequiredException,
  ChatSenderNotAllowedException,
  EChatMessageType,
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

/** Roles that chat with each other: one FARMER and one DISTRIBUTOR per room. */
const CHAT_PARTNER_ROLE: Partial<Record<string, string>> = {
  FARMER: 'DISTRIBUTOR',
  DISTRIBUTOR: 'FARMER',
};

/** Only a FARMER opens a new room; a DISTRIBUTOR replies in an existing one. */
const ROOM_OPENER_ROLE = 'FARMER';

/** Only a FARMER shares its diagnosis reports. */
const REPORT_SENDER_ROLE = 'FARMER';

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
  type: EChatMessageType;
  /** Shared diagnosis (GET /chat/rooms/:roomId/messages/:messageId/diagnosis); null for TEXT. */
  diagnosisId: string | null;
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
  /** Default TEXT. */
  type?: EChatMessageType;
  /** Required for DIAGNOSIS_REPORT: a COMPLETED diagnosis of the sender (a FARMER). */
  diagnosisId?: string;
};
export type TSendChatMessageOutput = {
  messageId: string;
  roomId: string;
  createdAt: Date;
};

/**
 * An ACTIVE FARMER or DISTRIBUTOR messages the other member of a FARMER <-> DISTRIBUTOR room, then pushes it to them in realtime
 * together with the sender's username and avatar.
 * The message is read by the receiver right away if they have the room open (entered), unread otherwise.
 * A DIAGNOSIS_REPORT message shares one of the FARMER sender's COMPLETED diagnoses with the room.
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
    @Inject(DIAGNOSIS_QUERY_PORT)
    private readonly diagnosisQuery: IDiagnosisQueryPort,
  ) {}

  async execute(input: TSendChatMessageInput): Promise<TSendChatMessageOutput> {
    const { senderId, roomId, receiverId } = input;
    const sender = await this.userQuery.findRoleById(senderId);
    if (!sender || !sender.isActive || !CHAT_PARTNER_ROLE[sender.role]) {
      throw new ChatSenderNotAllowedException(senderId);
    }
    if (input.type === EChatMessageType.DIAGNOSIS_REPORT) {
      await this.assertSharableDiagnosis(
        sender.role,
        senderId,
        input.diagnosisId,
      );
    }
    if (!roomId && receiverId) {
      await this.assertValidReceiver(sender.role, senderId, receiverId);
    }

    const { room, message, otherMemberId } =
      await this.unitOfWork.runInTransaction(async () => {
        const room = await this.resolveRoom(
          sender.role,
          senderId,
          roomId,
          receiverId,
        );
        const otherMemberId = room.otherMember(senderId);
        const message = ChatMessage.create({
          roomId: room.id,
          senderId,
          message: input.message,
          type: input.type,
          diagnosisId: input.diagnosisId,
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
        type: message.type,
        diagnosisId: message.diagnosisId,
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
    senderRole: string,
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
      if (existing) {
        return existing;
      }
      if (senderRole !== ROOM_OPENER_ROLE) {
        throw new ChatRoomOpenNotAllowedException(senderId, receiverId);
      }
      return this.rooms.saveIfAbsent(
        ChatRoom.create({ firstUserId: senderId, secondUserId: receiverId }),
      );
    }
    throw new ChatRoomOrReceiverRequiredException();
  }

  /** Only a FARMER shares a diagnosis, and only one of its own that is COMPLETED. */
  private async assertSharableDiagnosis(
    senderRole: string,
    senderId: string,
    diagnosisId: string | undefined,
  ): Promise<void> {
    if (senderRole !== REPORT_SENDER_ROLE) {
      throw new ChatDiagnosisReportNotAllowedException(senderId);
    }
    if (diagnosisId === undefined) {
      return; // the message itself rejects a report without diagnosisId
    }
    const diagnosis = await this.diagnosisQuery.findOwnership(diagnosisId);
    if (!diagnosis || diagnosis.userId !== senderId) {
      throw new ChatDiagnosisNotFoundException(diagnosisId);
    }
    if (diagnosis.status !== 'COMPLETED') {
      throw new ChatDiagnosisNotCompletedException(
        diagnosisId,
        diagnosis.status,
      );
    }
  }

  /** Receiver must be another ACTIVE user with the partner role (FARMER <-> DISTRIBUTOR). */
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
    if (!receiver.isActive || receiver.role !== CHAT_PARTNER_ROLE[senderRole]) {
      throw new InvalidChatReceiverException(receiverId);
    }
  }
}
