import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryRealtimeChannels } from '@shared/realtime';
import {
  ChatNotRoomMemberException,
  ChatRoom,
  ChatRoomNotFoundException,
} from '../../domain';
import { chatRoomChannel } from '../chat-room-channel';
import { InMemoryChatRoomRepository } from '../ports/fakes';
import { EnterChatRoomUseCase } from './enter-chat-room.use-case';

describe('EnterChatRoomUseCase', () => {
  let rooms: InMemoryChatRoomRepository;
  let channels: InMemoryRealtimeChannels;
  let useCase: EnterChatRoomUseCase;
  let room: ChatRoom;

  beforeEach(() => {
    rooms = new InMemoryChatRoomRepository();
    channels = new InMemoryRealtimeChannels();
    channels.connect('conn-1', 'farmer-1');
    useCase = new EnterChatRoomUseCase(
      rooms,
      channels,
      new InMemoryUnitOfWork(),
    );
    room = ChatRoom.create({
      firstUserId: 'farmer-1',
      secondUserId: 'distributor-1',
    });
    rooms.items.set(room.id, room);
  });

  it('joins the room channel and marks everything read', async () => {
    const before = new Date();

    await useCase.execute({
      userId: 'farmer-1',
      roomId: room.id,
      connectionId: 'conn-1',
    });

    expect(await channels.hasUser(chatRoomChannel(room.id), 'farmer-1')).toBe(
      true,
    );
    expect(room.lastReadAtOf('farmer-1')!.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(room.lastReadAtOf('distributor-1')).toBeNull();
  });

  it('rejects an unknown room without joining', async () => {
    await expect(
      useCase.execute({
        userId: 'farmer-1',
        roomId: 'nope',
        connectionId: 'conn-1',
      }),
    ).rejects.toThrow(ChatRoomNotFoundException);
    expect(await channels.hasUser(chatRoomChannel('nope'), 'farmer-1')).toBe(
      false,
    );
  });

  it('rejects a non-member without joining', async () => {
    channels.connect('conn-2', 'outsider');

    await expect(
      useCase.execute({
        userId: 'outsider',
        roomId: room.id,
        connectionId: 'conn-2',
      }),
    ).rejects.toThrow(ChatNotRoomMemberException);
    expect(await channels.hasUser(chatRoomChannel(room.id), 'outsider')).toBe(
      false,
    );
  });

  it('leaves the channel again when saving fails', async () => {
    jest.spyOn(rooms, 'save').mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute({
        userId: 'farmer-1',
        roomId: room.id,
        connectionId: 'conn-1',
      }),
    ).rejects.toThrow('db down');
    expect(await channels.hasUser(chatRoomChannel(room.id), 'farmer-1')).toBe(
      false,
    );
  });
});
