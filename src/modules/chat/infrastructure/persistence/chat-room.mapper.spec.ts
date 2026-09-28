import { ChatRoom } from '../../domain';
import { ChatRoomMapper } from './chat-room.mapper';

describe('ChatRoomMapper', () => {
  it('round-trips domain -> orm -> domain keeping every field', () => {
    const room = ChatRoom.create({
      firstUserId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
      secondUserId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
    });
    room.markReadBy(room.secondUserId, new Date('2026-01-02T00:00:00Z'));

    expect(ChatRoomMapper.toDomain(ChatRoomMapper.toOrm(room))).toEqual(room);
  });
});
