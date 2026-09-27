import { Module } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY } from './application/ports';
import { CreateNotificationUseCase } from './application/use-cases';
import { PgNotificationRepository } from './infrastructure/persistence/pg-notification.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    CreateNotificationUseCase,
    { provide: NOTIFICATION_REPOSITORY, useClass: PgNotificationRepository },
  ],
  exports: [],
})
export class NotificationModule {}
