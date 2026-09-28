import { InMemoryRealtimeChannels } from '@shared/realtime';
import { chatRoomChannel } from '../chat-room-channel';
import { LeaveChatRoomUseCase } from './leave-chat-room.use-case';

describe('LeaveChatRoomUseCase', () => {
  it('removes the connection from the room channel only', async () => {
    const channels = new InMemoryRealtimeChannels();
    channels.connect('conn-1', 'farmer-1');
    channels.join('conn-1', chatRoomChannel('r1'));
    channels.join('conn-1', chatRoomChannel('r2'));

    await new LeaveChatRoomUseCase(channels).execute({
      roomId: 'r1',
      connectionId: 'conn-1',
    });

    expect(await channels.hasUser(chatRoomChannel('r1'), 'farmer-1')).toBe(
      false,
    );
    expect(await channels.hasUser(chatRoomChannel('r2'), 'farmer-1')).toBe(
      true,
    );
  });

  it('is a no-op for a connection that never entered', async () => {
    await expect(
      new LeaveChatRoomUseCase(new InMemoryRealtimeChannels()).execute({
        roomId: 'r1',
        connectionId: 'conn-1',
      }),
    ).resolves.toBeUndefined();
  });
});
