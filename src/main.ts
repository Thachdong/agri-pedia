import { NestFactory } from '@nestjs/core';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<IConfigService>(CONFIG_SERVICE);
  await app.listen(config.get('app').port);
}
bootstrap();
