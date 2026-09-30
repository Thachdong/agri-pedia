import { ChatMessage } from '../../domain';

export type TChatMessagePageKey = { createdAt: Date; id: string };

export type TChatMessagePageQuery = {
  after?: TChatMessagePageKey;
  limit: number;
};

export interface IChatMessageRepository {
  save(message: ChatMessage): Promise<void>;
  /** Messages of `roomId`, createdAt desc then id desc, strictly after `after`. */
  findPageByRoom(
    roomId: string,
    query: TChatMessagePageQuery,
  ): Promise<ChatMessage[]>;
}

export const CHAT_MESSAGE_REPOSITORY = Symbol('CHAT_MESSAGE_REPOSITORY');
