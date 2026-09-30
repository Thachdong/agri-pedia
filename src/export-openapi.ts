// Writes the OpenAPI document to a file without starting the server or connecting to the DB.
// Usage: npm run openapi:export [-- <output path>] (default: openapi.json)
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { createApiDocument } from '@shared/swagger';
import { AppModule } from './app.module';

async function exportOpenApi() {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });
  const output = resolve(process.argv[2] ?? 'openapi.json');
  writeFileSync(output, `${JSON.stringify(createApiDocument(app), null, 2)}\n`);
  await app.close();
  process.stdout.write(`OpenAPI document written to ${output}\n`);
}
exportOpenApi();
