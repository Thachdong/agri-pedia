import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CONFIG_SERVICE, IConfigService } from '../config';
import { ACCESS_TOKEN_SCHEME } from './define-api-docs';

/** Serves Swagger UI at /docs (JSON at /docs-json). Disabled in production. Requires `nest build`. */
export const setupSwagger = (app: INestApplication): void => {
  if (
    app.get<IConfigService>(CONFIG_SERVICE).get('app').nodeEnv === 'production'
  ) {
    return;
  }
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('AgriPedia API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        ACCESS_TOKEN_SCHEME,
      )
      .build(),
  );
  SwaggerModule.setup('docs', app, document);
};
