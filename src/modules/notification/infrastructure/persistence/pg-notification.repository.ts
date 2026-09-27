import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { INotificationRepository } from '../../application/ports';
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

  async save(notification: Notification): Promise<void> {
    await this.repository.save(NotificationMapper.toOrm(notification));
  }
}
