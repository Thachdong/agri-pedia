import { InvalidChatMessageException } from '../exceptions/invalid-chat-message.exception';
import { CHAT_MESSAGE_MAX_LENGTH, ChatMessage } from './chat-message.entity';

describe('ChatMessage', () => {
  it('creates a trimmed message', () => {
    const message = ChatMessage.create({
      roomId: 'r1',
      senderId: 'f1',
      message: '  hello  ',
    });

    expect(message.id).toEqual(expect.any(String));
    expect(message.roomId).toBe('r1');
    expect(message.senderId).toBe('f1');
    expect(message.message).toBe('hello');
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('accepts the max length', () => {
    const text = 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH);
    expect(
      ChatMessage.create({ roomId: 'r1', senderId: 'f1', message: text })
        .message,
    ).toBe(text);
  });

  it.each(['', '   ', 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1)])(
    'rejects an empty or too long message',
    (text) => {
      expect(() =>
        ChatMessage.create({ roomId: 'r1', senderId: 'f1', message: text }),
      ).toThrow(InvalidChatMessageException);
    },
  );

  it('restores without validation', () => {
    const createdAt = new Date('2026-01-01');
    const message = ChatMessage.restore('m1', {
      roomId: 'r1',
      senderId: 'f1',
      message: 'hi',
      createdAt,
    });

    expect(message.id).toBe('m1');
    expect(message.createdAt).toBe(createdAt);
  });
});
