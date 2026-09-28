import { ChatNotRoomMemberException } from '../exceptions/chat-not-room-member.exception';
import { InvalidChatReceiverException } from '../exceptions/invalid-chat-receiver.exception';
import { ChatMessage } from './chat-message.entity';
import { ChatRoom } from './chat-room.entity';

const at = (iso: string) => new Date(iso);

const roomOf = (overrides: { lastMessageAt?: Date } = {}) =>
  ChatRoom.restore('r1', {
    firstUserId: 'f1',
    secondUserId: 'd1',
    createdAt: at('2026-01-01T00:00:00Z'),
    lastMessageAt: overrides.lastMessageAt ?? at('2026-01-01T00:00:00Z'),
    firstUserLastReadAt: null,
    secondUserLastReadAt: null,
  });

const messageAt = (senderId: string, iso: string, roomId = 'r1') =>
  ChatMessage.restore(`m-${iso}`, {
    roomId,
    senderId,
    message: 'hi',
    createdAt: at(iso),
  });

describe('ChatRoom', () => {
  it('creates a room between two users, unread by both', () => {
    const room = ChatRoom.create({ firstUserId: 'f1', secondUserId: 'd1' });

    expect(room.id).toEqual(expect.any(String));
    expect(room.firstUserId).toBe('f1');
    expect(room.secondUserId).toBe('d1');
    expect(room.createdAt).toBeInstanceOf(Date);
    expect(room.lastMessageAt).toBe(room.createdAt);
    expect(room.lastReadAtOf('f1')).toBeNull();
    expect(room.lastReadAtOf('d1')).toBeNull();
  });

  it('rejects a room with oneself', () => {
    expect(() =>
      ChatRoom.create({ firstUserId: 'f1', secondUserId: 'f1' }),
    ).toThrow(InvalidChatReceiverException);
  });

  it('returns the other member for either member', () => {
    const room = roomOf();

    expect(room.otherMember('f1')).toBe('d1');
    expect(room.otherMember('d1')).toBe('f1');
  });

  it('rejects a non-member', () => {
    const room = roomOf();

    expect(() => room.otherMember('x')).toThrow(ChatNotRoomMemberException);
    expect(() => room.markReadBy('x', new Date())).toThrow(
      ChatNotRoomMemberException,
    );
    expect(() => room.lastReadAtOf('x')).toThrow(ChatNotRoomMemberException);
  });

  describe('recordMessage', () => {
    it('moves lastMessageAt and marks the message read by its sender only', () => {
      const room = roomOf();

      room.recordMessage(messageAt('d1', '2026-01-02T00:00:00Z'));

      expect(room.lastMessageAt).toEqual(at('2026-01-02T00:00:00Z'));
      expect(room.lastReadAtOf('d1')).toEqual(at('2026-01-02T00:00:00Z'));
      expect(room.lastReadAtOf('f1')).toBeNull();
    });

    it('keeps the later lastMessageAt', () => {
      const room = roomOf({ lastMessageAt: at('2026-01-05T00:00:00Z') });

      room.recordMessage(messageAt('f1', '2026-01-02T00:00:00Z'));

      expect(room.lastMessageAt).toEqual(at('2026-01-05T00:00:00Z'));
    });

    it('rejects a sender outside the room', () => {
      expect(() =>
        roomOf().recordMessage(messageAt('x', '2026-01-02T00:00:00Z')),
      ).toThrow(ChatNotRoomMemberException);
    });

    it('rejects a message of another room', () => {
      expect(() =>
        roomOf().recordMessage(messageAt('f1', '2026-01-02T00:00:00Z', 'r2')),
      ).toThrow('belongs to room r2');
    });
  });

  describe('markReadBy', () => {
    it('sets the marker of that member only', () => {
      const room = roomOf();

      room.markReadBy('f1', at('2026-01-03T00:00:00Z'));

      expect(room.lastReadAtOf('f1')).toEqual(at('2026-01-03T00:00:00Z'));
      expect(room.firstUserLastReadAt).toEqual(at('2026-01-03T00:00:00Z'));
      expect(room.lastReadAtOf('d1')).toBeNull();
    });

    it('never moves the marker back', () => {
      const room = roomOf();
      room.markReadBy('d1', at('2026-01-03T00:00:00Z'));

      room.markReadBy('d1', at('2026-01-02T00:00:00Z'));

      expect(room.secondUserLastReadAt).toEqual(at('2026-01-03T00:00:00Z'));
    });
  });

  it('restores without validation', () => {
    const room = roomOf();

    expect(room.id).toBe('r1');
    expect(room.createdAt).toEqual(at('2026-01-01T00:00:00Z'));
  });
});
