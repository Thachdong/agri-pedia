import { ChatNotRoomMemberException } from '../exceptions/chat-not-room-member.exception';
import { InvalidChatReceiverException } from '../exceptions/invalid-chat-receiver.exception';
import { ChatRoom } from './chat-room.entity';

describe('ChatRoom', () => {
  it('creates a room between two users', () => {
    const room = ChatRoom.create({ firstUserId: 'f1', secondUserId: 'd1' });

    expect(room.id).toEqual(expect.any(String));
    expect(room.firstUserId).toBe('f1');
    expect(room.secondUserId).toBe('d1');
    expect(room.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a room with oneself', () => {
    expect(() =>
      ChatRoom.create({ firstUserId: 'f1', secondUserId: 'f1' }),
    ).toThrow(InvalidChatReceiverException);
  });

  it('returns the other member for either member', () => {
    const room = ChatRoom.create({ firstUserId: 'f1', secondUserId: 'd1' });

    expect(room.otherMember('f1')).toBe('d1');
    expect(room.otherMember('d1')).toBe('f1');
  });

  it('rejects a non-member', () => {
    const room = ChatRoom.create({ firstUserId: 'f1', secondUserId: 'd1' });

    expect(() => room.otherMember('x')).toThrow(ChatNotRoomMemberException);
  });

  it('restores without validation', () => {
    const createdAt = new Date('2026-01-01');
    const room = ChatRoom.restore('r1', {
      firstUserId: 'f1',
      secondUserId: 'd1',
      createdAt,
    });

    expect(room.id).toBe('r1');
    expect(room.createdAt).toBe(createdAt);
  });
});
