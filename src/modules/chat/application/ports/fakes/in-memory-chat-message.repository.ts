import { ChatMessage } from '../../../domain';
import {
  IChatMessageRepository,
  TChatMessagePageKey,
  TChatMessagePageQuery,
} from '../chat-message.repository';

const newestFirst = (a: TChatMessagePageKey, b: TChatMessagePageKey) =>
  b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);

export class InMemoryChatMessageRepository implements IChatMessageRepository {
  readonly items = new Map<string, ChatMessage>();

  async save(message: ChatMessage): Promise<void> {
    this.items.set(message.id, message);
  }

  async findPageByRoom(
    roomId: string,
    { after, limit }: TChatMessagePageQuery,
  ): Promise<ChatMessage[]> {
    return [...this.items.values()]
      .filter((message) => message.roomId === roomId)
      .filter((message) => !after || newestFirst(message, after) > 0)
      .sort(newestFirst)
      .slice(0, limit);
  }
}
