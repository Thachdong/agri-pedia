import { NestFactory } from '@nestjs/core';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { useAppLogger } from '@shared/logger';
import { setupSwagger } from '@shared/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  useAppLogger(app);
  setupSwagger(app);
  const config = app.get<IConfigService>(CONFIG_SERVICE);
  await app.listen(config.get('app').port);
}
bootstrap();
