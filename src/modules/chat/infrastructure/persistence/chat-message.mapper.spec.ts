import { ChatMessage } from '../../domain';
import { ChatMessageMapper } from './chat-message.mapper';

describe('ChatMessageMapper', () => {
  it('round-trips domain -> orm -> domain keeping every field', () => {
    const message = ChatMessage.create({
      roomId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
      senderId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
      message: 'Chào anh',
    });

    expect(
      ChatMessageMapper.toDomain(ChatMessageMapper.toOrm(message)),
    ).toEqual(message);
  });
});
