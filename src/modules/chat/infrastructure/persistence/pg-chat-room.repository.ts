import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { IChatRoomRepository } from '../../application/ports';
import { ChatRoom } from '../../domain';
import { ChatRoomMapper } from './chat-room.mapper';
import { ChatRoomOrmEntity } from './chat-room.orm-entity';

@Injectable()
export class PgChatRoomRepository
  extends TypeOrmRepositoryBase<ChatRoomOrmEntity>
  implements IChatRoomRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, ChatRoomOrmEntity);
  }

  async findById(id: string): Promise<ChatRoom | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? ChatRoomMapper.toDomain(row) : null;
  }

  async findByMembers(
    userId: string,
    otherUserId: string,
  ): Promise<ChatRoom | null> {
    // Same expressions as UQ_chat_rooms_members, so the lookup uses that index.
    const row = await this.repository
      .createQueryBuilder('room')
      .where(
        'LEAST(room.first_user_id, room.second_user_id) = LEAST(CAST(:a AS uuid), CAST(:b AS uuid))',
      )
      .andWhere(
        'GREATEST(room.first_user_id, room.second_user_id) = GREATEST(CAST(:a AS uuid), CAST(:b AS uuid))',
      )
      .setParameters({ a: userId, b: otherUserId })
      .getOne();
    return row ? ChatRoomMapper.toDomain(row) : null;
  }

  async saveIfAbsent(room: ChatRoom): Promise<ChatRoom> {
    // ON CONFLICT DO NOTHING waits for a concurrent insert of the same pair to
    // commit, so the read below sees whichever room won.
    await this.repository
      .createQueryBuilder()
      .insert()
      .values(ChatRoomMapper.toOrm(room))
      .orIgnore()
      .execute();
    const stored = await this.findByMembers(
      room.firstUserId,
      room.secondUserId,
    );
    if (!stored) {
      throw new Error(
        `Chat room of ${room.firstUserId}/${room.secondUserId} missing after insert`,
      );
    }
    return stored;
  }
}
