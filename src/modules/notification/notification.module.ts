import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './application/ports';
import {
  CreateNotificationUseCase,
  ListMyNotificationsUseCase,
  MarkNotificationReadUseCase,
} from './application/use-cases';
import './infrastructure/http/notification.api-docs';
import { NotificationController } from './infrastructure/http/notification.controller';
import { PgNotificationRepository } from './infrastructure/persistence/pg-notification.repository';

@Module({
  imports: [],
  controllers: [NotificationController],
  providers: [
    CreateNotificationUseCase,
    ListMyNotificationsUseCase,
    MarkNotificationReadUseCase,
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
  ],
  exports: [],
})
export class NotificationModule {}
