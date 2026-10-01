import { Inject, Injectable } from '@nestjs/common';
import { IRealtimeChannels, REALTIME_CHANNELS } from '@shared/realtime';
import { chatRoomChannel } from '../chat-room-channel';

export type TLeaveChatRoomInput = {
  roomId: string;
  connectionId: string;
};

/** The connection closed the room's chat window: new messages stay unread again. No-op if it never entered. */
@Injectable()
export class LeaveChatRoomUseCase {
  constructor(
    @Inject(REALTIME_CHANNELS) private readonly channels: IRealtimeChannels,
  ) {}

  async execute(input: TLeaveChatRoomInput): Promise<void> {
    this.channels.leave(input.connectionId, chatRoomChannel(input.roomId));
  }
}
