import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IChatMessageRepository } from '../../application/ports';
import { ChatMessage } from '../../domain';
import { ChatMessageMapper } from './chat-message.mapper';
import { ChatMessageOrmEntity } from './chat-message.orm-entity';

@Injectable()
export class PgChatMessageRepository
  extends TypeOrmRepositoryBase<ChatMessageOrmEntity>
  implements IChatMessageRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ChatMessageOrmEntity);
  }

  async save(message: ChatMessage): Promise<void> {
    await this.repository.insert(ChatMessageMapper.toOrm(message));
  }
}
