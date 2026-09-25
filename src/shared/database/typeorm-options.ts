import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { TDatabaseConfig } from '@config';

const srcDir = join(__dirname, '..', '..');

export const buildTypeOrmOptions = (
  config: TDatabaseConfig,
): DataSourceOptions => ({
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  logging: config.logging,
  synchronize: false,
  entities: [join(srcDir, 'modules', '**', '*.orm-entity.{ts,js}')],
  migrations: [join(srcDir, 'migrations', '*.{ts,js}')],
});
