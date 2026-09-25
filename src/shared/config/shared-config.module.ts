import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configGroups } from '@config';
import { CONFIG_SERVICE } from './config-service.interface';
import { NestConfigService } from './nest-config.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ cache: true, load: configGroups })],
  providers: [{ provide: CONFIG_SERVICE, useClass: NestConfigService }],
  exports: [CONFIG_SERVICE],
})
export class SharedConfigModule {}
