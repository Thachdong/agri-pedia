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
  const { nodeEnv, port, corsOrigins } = config.get('app');
  app.enableCors({
    origin: nodeEnv === 'production' ? corsOrigins : true,
    credentials: true,
  });
  await app.listen(port);
}
bootstrap();
