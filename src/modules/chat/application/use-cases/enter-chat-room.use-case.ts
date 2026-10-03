import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { IRealtimeChannels, REALTIME_CHANNELS } from '@shared/realtime';
import { ChatRoomNotFoundException } from '../../domain';
import { chatRoomChannel } from '../chat-room-channel';
import {
  CHAT_ROOM_REPOSITORY,
  IChatRoomRepository,
} from '../ports/chat-room.repository';

export type TEnterChatRoomInput = {
  userId: string;
  roomId: string;
  /** Realtime connection that opened the chat window. */
  connectionId: string;
};

/**
 * A member opens the room's chat window: everything so far becomes read, and
 * messages arriving while the window stays open are read on arrival (see SendChatMessage).
 */
@Injectable()
export class EnterChatRoomUseCase {
  constructor(
    @Inject(CHAT_ROOM_REPOSITORY) private readonly rooms: IChatRoomRepository,
    @Inject(REALTIME_CHANNELS) private readonly channels: IRealtimeChannels,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TEnterChatRoomInput): Promise<void> {
    const channel = chatRoomChannel(input.roomId);
    try {
      await this.unitOfWork.runInTransaction(async () => {
        const room = await this.rooms.findById(input.roomId);
        if (!room) {
          throw new ChatRoomNotFoundException(input.roomId);
        }
        room.otherMember(input.userId); // throws unless member
        // Join before marking: a message sent in between is then marked read on arrival.
        this.channels.join(input.connectionId, channel);
        room.markReadBy(input.userId, new Date());
        await this.rooms.save(room);
      });
    } catch (error) {
      this.channels.leave(input.connectionId, channel);
      throw error;
    }
  }
}
