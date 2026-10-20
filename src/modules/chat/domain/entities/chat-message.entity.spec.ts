import { EChatMessageType } from '../enums/chat-message-type.enum';
import { ChatInvalidDiagnosisReferenceException } from '../exceptions/chat-invalid-diagnosis-reference.exception';
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
    expect(message.type).toBe(EChatMessageType.TEXT);
    expect(message.diagnosisId).toBeNull();
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('creates a diagnosis report message', () => {
    const message = ChatMessage.create({
      roomId: 'r1',
      senderId: 'f1',
      message: 'Báo cáo chẩn đoán',
      type: EChatMessageType.DIAGNOSIS_REPORT,
      diagnosisId: 'd1',
    });

    expect(message.type).toBe(EChatMessageType.DIAGNOSIS_REPORT);
    expect(message.diagnosisId).toBe('d1');
  });

  it.each([
    [EChatMessageType.DIAGNOSIS_REPORT, null],
    [EChatMessageType.TEXT, 'd1'],
  ])('rejects a %s message with diagnosisId %s', (type, diagnosisId) => {
    expect(() =>
      ChatMessage.create({
        roomId: 'r1',
        senderId: 'f1',
        message: 'hi',
        type,
        diagnosisId,
      }),
    ).toThrow(ChatInvalidDiagnosisReferenceException);
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
      type: EChatMessageType.TEXT,
      diagnosisId: null,
      createdAt,
    });

    expect(message.id).toBe('m1');
    expect(message.createdAt).toBe(createdAt);
  });
});
