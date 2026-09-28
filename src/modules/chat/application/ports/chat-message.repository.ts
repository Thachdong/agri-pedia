import { ChatMessage } from '../../domain';

export interface IChatMessageRepository {
  save(message: ChatMessage): Promise<void>;
}

export const CHAT_MESSAGE_REPOSITORY = Symbol('CHAT_MESSAGE_REPOSITORY');
