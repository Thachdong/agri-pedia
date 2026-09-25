import { Module } from '@nestjs/common';
import { SharedConfigModule } from '@shared/config';
import { DatabaseModule } from '@shared/database';
import { CryptoModule } from '@shared/crypto';
import { EventBusModule } from '@shared/event-bus';
import { SharedLoggerModule } from '@shared/logger';
import { SharedHttpModule } from '@shared/http';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // shared infrastructure
    SharedConfigModule,
    SharedLoggerModule,
    DatabaseModule,
    EventBusModule,
    CryptoModule,
    SharedHttpModule,
    // business modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
