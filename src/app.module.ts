import { Module } from '@nestjs/common';
import { AccessTokenModule } from '@shared/access-token';
import { SharedConfigModule } from '@shared/config';
import { DatabaseModule } from '@shared/database';
import { CryptoModule } from '@shared/crypto';
import { EventBusModule } from '@shared/event-bus';
import { SharedLoggerModule } from '@shared/logger';
import { MessagingModule } from '@shared/messaging';
import { StorageModule } from '@shared/storage';
import { RealtimeModule } from '@shared/realtime';
import { SharedHttpModule } from '@shared/http';
import { MediaModule } from '@modules/media/media.module';
import { OtpModule } from '@modules/otp/otp.module';
import { ProductModule } from '@modules/product/product.module';
import { ReviewModule } from '@modules/review/review.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { UserModule } from '@modules/user/user.module';
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
    AccessTokenModule,
    MessagingModule,
    StorageModule,
    RealtimeModule,
    SharedHttpModule,
    // business modules
    UserModule,
    OtpModule,
    MediaModule,
    ProductModule,
    ReviewModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
