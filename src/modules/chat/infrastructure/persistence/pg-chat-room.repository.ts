import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  IChatRoomRepository,
  TChatRoomPageQuery,
  TChatRoomSummary,
} from '../../application/ports';
import { ChatMessage, ChatRoom } from '../../domain';
import { ChatRoomMapper } from './chat-room.mapper';
import { ChatRoomOrmEntity } from './chat-room.orm-entity';

type TRoomSummaryRow = {
  id: string;
  first_user_id: string;
  second_user_id: string;
  created_at: Date;
  last_message_at: Date;
  first_user_last_read_at: Date | null;
  second_user_last_read_at: Date | null;
  lm_id: string | null;
  lm_sender_id: string | null;
  lm_message: string | null;
  lm_created_at: Date | null;
  unread_count: string;
};

/** Read marker of member $1 in room `r` (null = never read → every message counts). */
const MY_READ_AT = `CASE WHEN r.first_user_id = $1 THEN r.first_user_last_read_at ELSE r.second_user_last_read_at END`;

/** Messages of the other member after $1's read marker. */
const UNREAD_OF_MEMBER = `m.sender_id <> $1 AND m.created_at > COALESCE(${MY_READ_AT}, '-infinity'::timestamptz)`;

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

  async findPageByMember(
    userId: string,
    { after, limit }: TChatRoomPageQuery,
  ): Promise<TChatRoomSummary[]> {
    const rows: TRoomSummaryRow[] = await this.repository.query(
      `SELECT r.*,
              lm.id AS lm_id, lm.sender_id AS lm_sender_id, lm.message AS lm_message, lm.created_at AS lm_created_at,
              (SELECT COUNT(*) FROM chat_messages m WHERE m.room_id = r.id AND ${UNREAD_OF_MEMBER}) AS unread_count
         FROM chat_rooms r
         LEFT JOIN LATERAL (
           SELECT id, sender_id, message, created_at FROM chat_messages
            WHERE room_id = r.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
         ) lm ON true
        WHERE (r.first_user_id = $1 OR r.second_user_id = $1)
          AND ($2::timestamptz IS NULL OR (r.last_message_at, r.id) < ($2::timestamptz, $3::uuid))
        ORDER BY r.last_message_at DESC, r.id DESC
        LIMIT $4`,
      [userId, after?.lastMessageAt ?? null, after?.id ?? null, limit],
    );
    return rows.map((row) => ({
      room: ChatRoom.restore(row.id, {
        firstUserId: row.first_user_id,
        secondUserId: row.second_user_id,
        createdAt: row.created_at,
        lastMessageAt: row.last_message_at,
        firstUserLastReadAt: row.first_user_last_read_at,
        secondUserLastReadAt: row.second_user_last_read_at,
      }),
      lastMessage:
        row.lm_id && row.lm_sender_id && row.lm_created_at
          ? ChatMessage.restore(row.lm_id, {
              roomId: row.id,
              senderId: row.lm_sender_id,
              message: row.lm_message ?? '',
              createdAt: row.lm_created_at,
            })
          : null,
      unreadCount: Number(row.unread_count),
    }));
  }

  async countUnreadByMember(userId: string): Promise<number> {
    const [{ total }]: { total: string }[] = await this.repository.query(
      `SELECT COUNT(*) AS total
         FROM chat_rooms r
         JOIN chat_messages m ON m.room_id = r.id
        WHERE (r.first_user_id = $1 OR r.second_user_id = $1)
          AND ${UNREAD_OF_MEMBER}`,
      [userId],
    );
    return Number(total);
  }

  async save(room: ChatRoom): Promise<void> {
    // Every timestamp only moves forward: GREATEST keeps a newer value written by
    // a concurrent save of the same room (e.g. a message sent while a member enters).
    await this.repository
      .createQueryBuilder()
      .update()
      .set({
        lastMessageAt: () =>
          'GREATEST(last_message_at, CAST(:lastMessageAt AS timestamptz))',
        firstUserLastReadAt: () =>
          'GREATEST(first_user_last_read_at, CAST(:firstUserLastReadAt AS timestamptz))',
        secondUserLastReadAt: () =>
          'GREATEST(second_user_last_read_at, CAST(:secondUserLastReadAt AS timestamptz))',
      })
      .where('id = :id', { id: room.id })
      .setParameters({
        lastMessageAt: room.lastMessageAt,
        firstUserLastReadAt: room.firstUserLastReadAt,
        secondUserLastReadAt: room.secondUserLastReadAt,
      })
      .execute();
  }
}
