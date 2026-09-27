import { Module } from '@nestjs/common';
import { CreateNotificationUseCase } from './application/use-cases';

@Module({
  imports: [],
  controllers: [],
  providers: [CreateNotificationUseCase],
  exports: [],
})
export class NotificationModule {}
