import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import {
  INotificationRepository,
  TNotificationPageQuery,
} from '../../application/ports';
import { Notification } from '../../domain';
import { NotificationMapper } from './notification.mapper';
import { NotificationOrmEntity } from './notification.orm-entity';

@Injectable()
export class PgNotificationRepository
  extends TypeOrmRepositoryBase<NotificationOrmEntity>
  implements INotificationRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, NotificationOrmEntity);
  }

  async findByIdAndUser(
    id: string,
    userId: string,
  ): Promise<Notification | null> {
    const row = await this.repository.findOneBy({ id, userId });
    return row ? NotificationMapper.toDomain(row) : null;
  }

  async findByUser(
    userId: string,
    { after, limit }: TNotificationPageQuery,
  ): Promise<Notification[]> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId });
    if (after) {
      // Row comparison matches the (created_at desc, id desc) order and uses IDX_notifications_user_created_id.
      query.andWhere(
        '(notification.created_at, notification.id) < (:createdAt, :id)',
        { createdAt: after.createdAt, id: after.id },
      );
    }
    const rows = await query
      .orderBy('notification.created_at', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .limit(limit)
      .getMany();
    return rows.map((row) => NotificationMapper.toDomain(row));
  }

  async markAllReadByUser(userId: string): Promise<void> {
    await this.repository.update({ userId, isRead: false }, { isRead: true });
  }

  async save(notification: Notification): Promise<void> {
    await this.repository.save(NotificationMapper.toOrm(notification));
  }
}
