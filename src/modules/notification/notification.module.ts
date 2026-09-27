import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './application/ports';
import {
  CreateNotificationUseCase,
  ListMyNotificationsUseCase,
} from './application/use-cases';
import { PgNotificationRepository } from './infrastructure/persistence/pg-notification.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    CreateNotificationUseCase,
    ListMyNotificationsUseCase,
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
  ],
  exports: [],
})
export class NotificationModule {}
