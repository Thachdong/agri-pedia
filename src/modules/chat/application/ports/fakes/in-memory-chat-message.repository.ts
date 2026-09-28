import { ChatMessage } from '../../../domain';
import { IChatMessageRepository } from '../chat-message.repository';

export class InMemoryChatMessageRepository implements IChatMessageRepository {
  readonly items = new Map<string, ChatMessage>();

  async save(message: ChatMessage): Promise<void> {
    this.items.set(message.id, message);
  }
}
