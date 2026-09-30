import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IChatMessageRepository,
  TChatMessagePageQuery,
} from '../../application/ports';
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

  async findPageByRoom(
    roomId: string,
    { after, limit }: TChatMessagePageQuery,
  ): Promise<ChatMessage[]> {
    const query = this.repository
      .createQueryBuilder('m')
      .where('m.roomId = :roomId', { roomId })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .limit(limit);
    if (after) {
      query.andWhere(
        '(m.createdAt, m.id) < (:afterCreatedAt::timestamptz, :afterId::uuid)',
        { afterCreatedAt: after.createdAt, afterId: after.id },
      );
    }
    const rows = await query.getMany();
    return rows.map((row) => ChatMessageMapper.toDomain(row));
  }
}
