import { Module } from '@nestjs/common';
import { SharedConfigModule } from '@shared/config';
import { DatabaseModule } from '@shared/database';
import { EventBusModule } from '@shared/event-bus';
import { SharedHttpModule } from '@shared/http';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // shared infrastructure
    SharedConfigModule,
    DatabaseModule,
    EventBusModule,
    SharedHttpModule,
    // business modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
