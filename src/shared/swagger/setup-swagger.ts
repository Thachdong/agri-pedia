import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { CONFIG_SERVICE, IConfigService } from '../config';
import { ACCESS_TOKEN_SCHEME } from './define-api-docs';

/** Builds the OpenAPI document from the app's controllers. Requires `nest build`. */
export const createApiDocument = (app: INestApplication): OpenAPIObject =>
  SwaggerModule.createDocument(
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

/** Serves Swagger UI at /docs (JSON at /docs-json). Disabled in production. Requires `nest build`. */
export const setupSwagger = (app: INestApplication): void => {
  if (
    app.get<IConfigService>(CONFIG_SERVICE).get('app').nodeEnv === 'production'
  ) {
    return;
  }
  SwaggerModule.setup('docs', app, createApiDocument(app));
};
